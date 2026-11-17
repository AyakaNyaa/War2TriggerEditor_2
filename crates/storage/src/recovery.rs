use crate::{hash, io_fault};
use contracts::{Fault, RecoveryEntry, RecoveryState, Result};
use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
};

fn path(directory: &Path, id: &str) -> Result<PathBuf> {
    if uuid::Uuid::parse_str(id).is_err() {
        return Err(Fault::new("recovery.invalid_id"));
    }
    Ok(directory.join(format!("{id}.json")))
}

pub fn write(directory: &Path, id: &str, state: &RecoveryState) -> Result<()> {
    let target = path(directory, id)?;
    fs::create_dir_all(directory).map_err(io_fault)?;
    let bytes = serde_json::to_vec(state).map_err(io_fault)?;
    let mut temporary = tempfile::NamedTempFile::new_in(directory).map_err(io_fault)?;
    temporary.write_all(&bytes).map_err(io_fault)?;
    temporary.as_file().sync_all().map_err(io_fault)?;
    temporary
        .persist(target)
        .map_err(io_fault)?
        .sync_all()
        .map_err(io_fault)?;
    Ok(())
}

pub fn read(directory: &Path, id: &str) -> Result<RecoveryState> {
    let target = path(directory, id)?;
    if fs::metadata(&target).map_err(io_fault)?.len() > 128 * 1024 * 1024 {
        return Err(Fault::new("file.too_large"));
    }
    let state: RecoveryState = serde_json::from_slice(&fs::read(target).map_err(io_fault)?)
        .map_err(|error| Fault::new("recovery.invalid_snapshot").detail(error))?;
    if state.version != 1 || hash(&state.source.bytes) != state.source.hash {
        return Err(Fault::new("recovery.invalid_snapshot"));
    }
    Ok(state)
}

pub fn list(directory: &Path) -> Result<Vec<RecoveryEntry>> {
    if !directory.exists() {
        return Ok(Vec::new());
    }
    let mut entries = Vec::new();
    for entry in fs::read_dir(directory).map_err(io_fault)? {
        let entry = entry.map_err(io_fault)?;
        let name = entry.file_name().to_string_lossy().into_owned();
        let Some(id) = name.strip_suffix(".json") else {
            continue;
        };
        if uuid::Uuid::parse_str(id).is_err() {
            continue;
        }
        // Report damaged snapshots individually and keep their bytes for recovery.
        // One bad entry must not hide the other sessions after a crash.
        let (name, revision, diagnostics) = match read(directory, id) {
            Ok(state) => (state.source.name, state.revision, Vec::new()),
            Err(error) => (id.to_owned(), 0, vec![error]),
        };
        entries.push(RecoveryEntry {
            id: id.into(),
            name,
            revision,
            diagnostics,
        });
    }
    Ok(entries)
}

pub fn clear(directory: &Path, id: &str) -> Result<()> {
    let target = path(directory, id)?;
    if target.exists() {
        fs::remove_file(target).map_err(io_fault)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use contracts::FileSnapshot;

    #[test]
    fn snapshots_survive_restart_and_detect_corrupt_source() {
        let dir = tempfile::tempdir().unwrap();
        let id = uuid::Uuid::new_v4().to_string();
        let bytes = vec![254, 237];
        let mut state = RecoveryState {
            version: 1,
            source: FileSnapshot {
                name: "test.w2tr".into(),
                path: None,
                hash: hash(&bytes),
                bytes,
            },
            commands: vec![vec![5, 0, 1]],
            revision: 2,
        };
        write(dir.path(), &id, &state).unwrap();
        assert_eq!(read(dir.path(), &id).unwrap().commands, state.commands);
        assert_eq!(list(dir.path()).unwrap().len(), 1);
        state.source.bytes.push(0);
        write(dir.path(), &id, &state).unwrap();
        assert!(read(dir.path(), &id).is_err());
        assert!(read(dir.path(), "../escape").is_err());
    }

    #[test]
    fn one_damaged_snapshot_does_not_hide_healthy_recovery_entries() {
        let dir = tempfile::tempdir().unwrap();
        let good = uuid::Uuid::new_v4().to_string();
        let bad = uuid::Uuid::new_v4().to_string();
        let bytes = vec![254, 237];
        let state = RecoveryState {
            version: 1,
            source: FileSnapshot {
                name: "healthy.w2tr".into(),
                path: None,
                hash: hash(&bytes),
                bytes,
            },
            commands: vec![],
            revision: 2,
        };
        write(dir.path(), &good, &state).unwrap();
        let damaged = path(dir.path(), &bad).unwrap();
        fs::write(&damaged, b"{damaged").unwrap();
        fs::write(dir.path().join("unrelated.json"), b"{}").unwrap();
        let entries = list(dir.path()).unwrap();
        assert_eq!(entries.len(), 2);
        assert!(entries
            .iter()
            .find(|entry| entry.id == good)
            .unwrap()
            .diagnostics
            .is_empty());
        assert_eq!(
            entries.iter().find(|entry| entry.id == good).unwrap().name,
            "healthy.w2tr"
        );
        let entry =
            serde_json::to_value(entries.iter().find(|entry| entry.id == bad).unwrap()).unwrap();
        assert_eq!(entry["diagnostics"][0]["code"], "recovery.invalid_snapshot");
        assert_eq!(fs::read(damaged).unwrap(), b"{damaged");
        assert!(dir.path().join("unrelated.json").exists());
    }
}
