const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const appJsonPath = path.join(rootDir, 'app.json');
const gradlePath = path.join(rootDir, 'android', 'app', 'build.gradle');

function bumpSemver(versionStr, type = 'patch') {
  const parts = versionStr.split('.').map(num => parseInt(num, 10) || 0);
  while (parts.length < 3) parts.push(0);

  if (type === 'major') {
    parts[0] += 1;
    parts[1] = 0;
    parts[2] = 0;
  } else if (type === 'minor') {
    parts[1] += 1;
    parts[2] = 0;
  } else {
    // patch
    parts[2] += 1;
  }
  return parts.join('.');
}

function updateVersion() {
  const args = process.argv.slice(2);
  const inputArg = args[0] ? args[0].trim() : 'patch';

  // 1. Read package.json
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const currentVersion = pkg.version || '1.0.0';

  let nextVersion;
  if (/^\d+\.\d+\.\d+$/.test(inputArg)) {
    nextVersion = inputArg;
  } else if (['major', 'minor', 'patch'].includes(inputArg.toLowerCase())) {
    nextVersion = bumpSemver(currentVersion, inputArg.toLowerCase());
  } else {
    nextVersion = bumpSemver(currentVersion, 'patch');
  }

  // 2. Read app.json
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  const currentVersionCode = appJson.expo?.android?.versionCode ?? 1;
  const nextVersionCode = currentVersionCode + 1;

  // Update package.json
  pkg.version = nextVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

  // Update app.json
  if (!appJson.expo) appJson.expo = {};
  appJson.expo.version = nextVersion;

  if (!appJson.expo.android) appJson.expo.android = {};
  appJson.expo.android.versionCode = nextVersionCode;

  if (!appJson.expo.ios) appJson.expo.ios = {};
  appJson.expo.ios.buildNumber = String(nextVersionCode);

  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');

  // 3. Update android/app/build.gradle
  if (fs.existsSync(gradlePath)) {
    let gradleContent = fs.readFileSync(gradlePath, 'utf8');

    // Replace versionCode <number>
    gradleContent = gradleContent.replace(/versionCode\s+\d+/, `versionCode ${nextVersionCode}`);

    // Replace versionName "<string>"
    gradleContent = gradleContent.replace(/versionName\s+["'][^"']+["']/, `versionName "${nextVersion}"`);

    fs.writeFileSync(gradlePath, gradleContent, 'utf8');
  }

  console.log('\n🚀 Version updated successfully!');
  console.log(`  • Version:      ${currentVersion} → ${nextVersion}`);
  console.log(`  • Version Code: ${currentVersionCode} → ${nextVersionCode}`);
  console.log(`\nUpdated files:`);
  console.log(`  ✓ package.json`);
  console.log(`  ✓ app.json`);
  console.log(`  ✓ android/app/build.gradle\n`);
}

updateVersion();
