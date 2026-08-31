const fs = require('fs');
const path = require('path');
const os = require('os');

const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const apkSourcePath = path.join(rootDir, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');

function copyReleaseApk() {
  if (!fs.existsSync(apkSourcePath)) {
    console.error(`\n❌ Error: Release APK not found at: ${apkSourcePath}`);
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const appName = pkg.name || 'autoringtone-mi';
  const appVersion = pkg.version || '1.0.0';

  const outputFileName = `${appName}-${appVersion}.apk`;

  // Target directory: D:\Downloads if exists, otherwise ~/Downloads
  let targetDir = 'D:\\Downloads';
  if (!fs.existsSync(targetDir)) {
    targetDir = path.join(os.homedir(), 'Downloads');
  }

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const targetPath = path.join(targetDir, outputFileName);

  fs.copyFileSync(apkSourcePath, targetPath);

  const stats = fs.statSync(targetPath);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

  console.log('\n==================================================');
  console.log('📦 APK RELEASE COPIED SUCCESSFULLY!');
  console.log('==================================================');
  console.log(`  • App Name:    ${appName}`);
  console.log(`  • App Version: ${appVersion}`);
  console.log(`  • APK File:    ${outputFileName}`);
  console.log(`  • File Size:   ${sizeMb} MB`);
  console.log(`  • Location:    ${targetPath}`);
  console.log('==================================================\n');
}

copyReleaseApk();
