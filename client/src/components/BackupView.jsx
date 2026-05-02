import React, { useMemo, useState } from 'react';
import { authService } from '../services/auth';

const BackupView = ({ user }) => {
	const [selectedFile, setSelectedFile] = useState(null);
	const [isExporting, setIsExporting] = useState(false);
	const [isImporting, setIsImporting] = useState(false);
	const [message, setMessage] = useState('');

	const isSuperuser = useMemo(() => user?.role === 'SUPERUSER', [user?.role]);

	const setFeedback = (text, isError = false) => {
		setMessage(`${isError ? 'error:' : 'success:'} ${text}`);
	};

	const handleExport = async () => {
		setIsExporting(true);
		setMessage('');

		try {
			const backupBlob = await authService.exportSystemBackup();
			const fileName = `goji-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
			const url = URL.createObjectURL(backupBlob);

			const link = document.createElement('a');
			link.href = url;
			link.download = fileName;
			document.body.appendChild(link);
			link.click();
			link.remove();

			URL.revokeObjectURL(url);
			setFeedback('Backup exported successfully.');
		} catch (error) {
			setFeedback(error.response?.data?.error || 'Failed to export backup.', true);
		} finally {
			setIsExporting(false);
		}
	};

	const handleFileChange = (event) => {
		const file = event.target.files?.[0] || null;
		setSelectedFile(file);
	};

	const handleImport = async () => {
		if (!selectedFile) {
			setFeedback('Please choose a backup file first.', true);
			return;
		}

		setIsImporting(true);
		setMessage('');

		try {
			const fileContents = await selectedFile.text();
			const payload = JSON.parse(fileContents);

			const confirmed = window.confirm(
				'Importing a backup will replace all current data on this instance. Continue?'
			);

			if (!confirmed) {
				setIsImporting(false);
				return;
			}

			await authService.importSystemBackup(payload);
			setFeedback('Backup imported successfully. Please refresh the page.');
			setSelectedFile(null);
		} catch (error) {
			if (error instanceof SyntaxError) {
				setFeedback('Selected file is not valid JSON.', true);
			} else {
				setFeedback(error.response?.data?.error || 'Failed to import backup.', true);
			}
		} finally {
			setIsImporting(false);
		}
	};

	if (!isSuperuser) {
		return (
			<div className="settings-section">
				<h3>Backup & Restore</h3>
				<p className="backup-muted">
					Backup and restore are restricted to SUPERUSER accounts.
				</p>
			</div>
		);
	}

	return (
		<div className="settings-section">
			<h3>Backup & Restore</h3>
			<p className="backup-muted">
				Export project data to JSON (users are excluded), then import it into another Goji instance where matching users already exist.
			</p>

			<div className="backup-actions">
				<button
					type="button"
					className="btn btn-primary"
					onClick={handleExport}
					disabled={isExporting}
				>
					{isExporting ? 'Exporting...' : 'Download Backup'}
				</button>
			</div>

			<div className="backup-import">
				<label htmlFor="backupFile" className="backup-file-label">
					Backup File (.json)
				</label>
				<input
					id="backupFile"
					type="file"
					accept="application/json,.json"
					onChange={handleFileChange}
				/>

				{selectedFile && (
					<div className="backup-selected-file">Selected: {selectedFile.name}</div>
				)}

				<button
					type="button"
					className="btn btn-danger"
					onClick={handleImport}
					disabled={isImporting || !selectedFile}
				>
					{isImporting ? 'Importing...' : 'Upload Backup To This Instance'}
				</button>
			</div>

			{message && (
				<div className={`message ${message.startsWith('success:') ? 'success' : 'error'}`}>
					{message.replace(/^success:\s|^error:\s/, '')}
				</div>
			)}
		</div>
	);
};

export default BackupView;
