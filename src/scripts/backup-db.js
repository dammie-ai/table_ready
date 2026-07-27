const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_HOST = process.env.DB_HOST;
const DB_PORT = process.env.DB_PORT;
const DB_NAME = process.env.DB_NAME;
const COMPOSE_FILE = path.join(__dirname, '..', '..', 'docker-compose.yml');
const CONTAINER_NAME = 'tableready-db';

const BACKUP_DIR = path.join(__dirname, '..', '..', 'backups');
const MAX_BACKUPS = 7;
const USE_DOCKER = true;

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

function cleanupOldBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.endsWith('.sql') || file.endsWith('.sql.gz'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        time: fs.statSync(path.join(BACKUP_DIR, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > MAX_BACKUPS) {
      const filesToDelete = files.slice(MAX_BACKUPS);
      filesToDelete.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`Cleaned up old backup: ${file.name}`);
      });
    }
  } catch (err) {
    console.error('Error cleaning up old backups:', err.message);
  }
}

function createBackup() {
  return new Promise((resolve, reject) => {
    ensureBackupDir();

    const timestamp = getTimestamp();
    const backupFile = `tableready_backup_${timestamp}.sql`;
    const backupPath = path.join(BACKUP_DIR, backupFile);

    let command;

    if (USE_DOCKER) {
      command = `docker-compose -f "${COMPOSE_FILE}" exec -T ${CONTAINER_NAME} pg_dump -U ${DB_USER} -d ${DB_NAME} --no-owner --no-acl > "${backupPath}"`;
    } else {
      const pgDumpPath = 'pg_dump';
      const args = [
        '-U', DB_USER,
        '-h', DB_HOST,
        '-p', DB_PORT,
        '-d', DB_NAME,
        '--no-owner',
        '--no-acl',
        '-f', backupPath
      ];
      command = `${pgDumpPath} ${args.map(arg => `"${arg}"`).join(' ')}`;
    }

    console.log(`Starting backup: ${backupPath}`);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Backup failed: ${error.message}`);
        if (stderr) console.error(`stderr: ${stderr}`);
        reject(error);
        return;
      }

      const stats = fs.statSync(backupPath);
      const fileSize = (stats.size / 1024 / 1024).toFixed(2);

      console.log(`Backup completed successfully!`);
      console.log(`  File: ${backupPath}`);
      console.log(`  Size: ${fileSize} MB`);

      cleanupOldBackups();

      resolve({
        success: true,
        file: backupPath,
        size: fileSize,
        timestamp: timestamp
      });
    });
  });
}

function listBackups() {
  try {
    ensureBackupDir();
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.endsWith('.sql') || file.endsWith('.sql.gz'))
      .map(file => {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: (stats.size / 1024 / 1024).toFixed(2),
          created: stats.mtime
        };
      })
      .sort((a, b) => b.created - a.created);

    console.log('\nExisting backups:');
    console.log('==================');
    files.forEach((file, index) => {
      console.log(`${index + 1}. ${file.name} (${file.size} MB) - ${file.created.toLocaleString()}`);
    });
    console.log(`\nTotal: ${files.length} backups`);

    return files;
  } catch (err) {
    console.error('Error listing backups:', err.message);
    return [];
  }
}

const command = process.argv[2];

if (command === 'list') {
  listBackups();
} else if (command === 'restore') {
  const backupFile = process.argv[3];
  if (!backupFile) {
    console.error('Usage: node backup-db.js restore <backup-file>');
    process.exit(1);
  }

  const fullPath = path.isAbsolute(backupFile) ? backupFile : path.join(BACKUP_DIR, backupFile);

  if (!fs.existsSync(fullPath)) {
    console.error(`Backup file not found: ${fullPath}`);
    process.exit(1);
  }

  const confirm = process.argv[3] === '--confirm';
  if (!confirm) {
    console.error('WARNING: This will overwrite the current database!');
    console.error('To proceed, run: node backup-db.js restore <file> --confirm');
    process.exit(1);
  }

  let command;

  if (USE_DOCKER) {
    command = `docker-compose -f "${COMPOSE_FILE}" exec -T ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME} -f - < "${fullPath}"`;
  } else {
    const psqlPath = 'psql';
    const args = [
      '-U', DB_USER,
      '-h', DB_HOST,
      '-p', DB_PORT,
      '-d', DB_NAME,
      '-f', fullPath
    ];
    command = `${psqlPath} ${args.map(arg => `"${arg}"`).join(' ')}`;
  }

  console.log(`Restoring from: ${fullPath}`);

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Restore failed: ${error.message}`);
      if (stderr) console.error(`stderr: ${stderr}`);
      process.exit(1);
    }
    console.log('Restore completed successfully!');
  });
} else {
  createBackup()
    .then(result => {
      console.log('\nBackup Summary:');
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(err => {
      console.error('Backup failed:', err);
      process.exit(1);
    });
}
