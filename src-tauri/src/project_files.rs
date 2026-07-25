use std::fs;
use std::io::ErrorKind;
use std::path::{Component, Path, PathBuf};

use crate::AppError;

fn validate_name(value: &str) -> Result<(), AppError> {
    let mut components = Path::new(value).components();
    if !matches!(components.next(), Some(Component::Normal(_))) || components.next().is_some() {
        return Err(AppError::Message(format!(
            "project file name must be one path component: {value}"
        )));
    }
    Ok(())
}

fn canonical_project_root(project_root: &Path) -> Result<PathBuf, AppError> {
    project_root
        .canonicalize()
        .map_err(|error| AppError::Message(format!("resolve project root: {error}")))
}

fn reject_symlink(path: &Path, label: &str) -> Result<Option<fs::Metadata>, AppError> {
    match fs::symlink_metadata(path) {
        Ok(metadata) => {
            if metadata.file_type().is_symlink() {
                return Err(AppError::Message(format!(
                    "{label} must not be a symlink: {}",
                    path.display()
                )));
            }
            Ok(Some(metadata))
        }
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(None),
        Err(error) => Err(AppError::Message(format!(
            "inspect {label} {}: {error}",
            path.display()
        ))),
    }
}

pub fn safe_project_data_file(
    project_root: &Path,
    directory_name: &str,
    file_name: &str,
    create_directory: bool,
) -> Result<PathBuf, AppError> {
    validate_name(directory_name)?;
    validate_name(file_name)?;
    let root = canonical_project_root(project_root)?;
    let directory = root.join(directory_name);

    match reject_symlink(&directory, "project data directory")? {
        Some(metadata) if !metadata.is_dir() => {
            return Err(AppError::Message(format!(
                "project data path is not a directory: {}",
                directory.display()
            )));
        }
        None if create_directory => {
            fs::create_dir(&directory).map_err(|error| {
                AppError::Message(format!("create project data directory: {error}"))
            })?;
        }
        _ => {}
    }

    if directory.exists() {
        let resolved = directory.canonicalize().map_err(|error| {
            AppError::Message(format!("resolve project data directory: {error}"))
        })?;
        if !resolved.starts_with(&root) {
            return Err(AppError::Message(format!(
                "project data directory escapes project root: {}",
                resolved.display()
            )));
        }
    }

    let file = directory.join(file_name);
    if let Some(metadata) = reject_symlink(&file, "project data file")? {
        if !metadata.is_file() {
            return Err(AppError::Message(format!(
                "project data path is not a file: {}",
                file.display()
            )));
        }
    }
    Ok(file)
}

pub fn safe_project_read_file(
    project_root: &Path,
    file_name: &str,
) -> Result<Option<PathBuf>, AppError> {
    validate_name(file_name)?;
    let root = canonical_project_root(project_root)?;
    let path = root.join(file_name);
    let metadata = match fs::metadata(&path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(None),
        Err(error) => {
            return Err(AppError::Message(format!(
                "inspect project source file {}: {error}",
                path.display()
            )));
        }
    };
    if !metadata.is_file() {
        return Ok(None);
    }
    let resolved = path
        .canonicalize()
        .map_err(|error| AppError::Message(format!("resolve project source file: {error}")))?;
    if !resolved.starts_with(&root) {
        return Err(AppError::Message(format!(
            "project source file escapes project root: {}",
            resolved.display()
        )));
    }
    Ok(Some(resolved))
}
