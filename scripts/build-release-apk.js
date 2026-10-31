/**
 * Automated Release APK Build & Distribution Script
 * Vendor Mobile Application
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT_DIR = path.resolve(__dirname, '..');
const ANDROID_DIR = path.join(ROOT_DIR, 'android');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const BUILD_GRADLE_PATH = path.join(ANDROID_DIR, 'app', 'build.gradle');

function runCommand(command, cwd = ROOT_DIR) {
  console.log(`\n⏳ Executing: ${command}`);
  execSync(command, {
    cwd,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_OPTIONS: '--max-old-space-size=4096'
    }
  });
}

function getAppVersion() {
  const gradleContent = fs.readFileSync(BUILD_GRADLE_PATH, 'utf-8');
  const codeMatch = gradleContent.match(/versionCode\s+(\d+)/);
  const nameMatch = gradleContent.match(/versionName\s+["']([^"']+)["']/);

  return {
    versionCode: codeMatch ? codeMatch[1] : '1',
    versionName: nameMatch ? nameMatch[1] : '1.0'
  };
}

function getGitCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: ROOT_DIR }).toString().trim();
  } catch (e) {
    return 'local';
  }
}

function calculateSha256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

async function buildRelease() {
  console.log('================================================================');
  console.log('🚀 STARTING AUTOMATED RELEASE APK BUILD PIPELINE');
  console.log('================================================================');

  const startTime = Date.now();
  const { versionName, versionCode } = getAppVersion();
  const commitId = getGitCommit();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  console.log(`📌 Build Target: Release APK`);
  console.log(`📌 Version Name: ${versionName}`);
  console.log(`📌 Version Code: ${versionCode}`);
  console.log(`📌 Commit ID:    ${commitId}`);

  // Step 1: TypeScript validation
  console.log('\n--- STEP 1/4: Running TypeScript Verification ---');
  runCommand('npx tsc --noEmit');
  console.log('✅ TypeScript checks passed cleanly.');

  // Step 2: Compile Offline Release JS Bundle
  console.log('\n--- STEP 2/4: Bundling Offline Release JavaScript ---');
  const assetsDir = path.join(ANDROID_DIR, 'app', 'src', 'main', 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const bundleCmd = [
    'npx react-native bundle',
    '--platform android',
    '--dev false',
    '--entry-file index.js',
    '--bundle-output android/app/src/main/assets/index.android.bundle',
    '--assets-dest android/app/src/main/res',
    '--max-workers 1'
  ].join(' ');

  runCommand(bundleCmd);
  console.log('✅ Offline Release JavaScript bundle compiled successfully.');

  // Step 3: Gradle assembleRelease
  console.log('\n--- STEP 3/4: Compiling Release APK via Gradle ---');
  const isWindows = process.platform === 'win32';
  const gradlewCmd = isWindows
    ? `"${path.join(ANDROID_DIR, 'gradlew.bat')}" assembleRelease`
    : './gradlew assembleRelease';
  runCommand(gradlewCmd, ANDROID_DIR);
  console.log('✅ Gradle assembleRelease completed successfully.');

  // Step 4: Package and Distribute Artifact
  console.log('\n--- STEP 4/4: Packaging Versioned Build Artifact ---');
  const generatedApkPath = path.join(
    ANDROID_DIR,
    'app',
    'build',
    'outputs',
    'apk',
    'release',
    'app-release.apk'
  );

  if (!fs.existsSync(generatedApkPath)) {
    throw new Error(`Expected Release APK not found at: ${generatedApkPath}`);
  }

  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  const versionedApkName = `VendorMobile-v${versionName}-build${versionCode}-${commitId}.apk`;
  const latestApkName = 'VendorMobile-latest.apk';

  const versionedApkPath = path.join(DIST_DIR, versionedApkName);
  const latestApkPath = path.join(DIST_DIR, latestApkName);

  fs.copyFileSync(generatedApkPath, versionedApkPath);
  fs.copyFileSync(generatedApkPath, latestApkPath);

  const stats = fs.statSync(versionedApkPath);
  const fileSizeMb = (stats.size / (1024 * 1024)).toFixed(2);
  const sha256 = calculateSha256(versionedApkPath);
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  // Write metadata JSON
  const metadata = {
    status: 'SUCCESS',
    buildDate: new Date().toISOString(),
    versionName,
    versionCode,
    commitId,
    fileSizeMb: `${fileSizeMb} MB`,
    sha256,
    artifacts: {
      versioned: versionedApkName,
      latest: latestApkName,
      distDirectory: DIST_DIR
    }
  };

  fs.writeFileSync(
    path.join(DIST_DIR, 'build-metadata.json'),
    JSON.stringify(metadata, null, 2),
    'utf-8'
  );

  console.log('\n================================================================');
  console.log('🎉 RELEASE APK BUILD & DISTRIBUTION COMPLETE!');
  console.log('================================================================');
  console.log(`📦 Status:           SUCCESS`);
  console.log(`📦 Version:          ${versionName} (Build ${versionCode})`);
  console.log(`📦 Commit:           ${commitId}`);
  console.log(`📦 Size:             ${fileSizeMb} MB`);
  console.log(`📦 SHA256 Checksum:  ${sha256}`);
  console.log(`📦 Versioned APK:    ${versionedApkPath}`);
  console.log(`📦 Latest APK:       ${latestApkPath}`);
  console.log(`⏱️ Duration:         ${durationSec}s`);
  console.log('================================================================\n');
}

buildRelease().catch((err) => {
  console.error('\n❌ BUILD FAILED:', err.message || err);
  process.exit(1);
});

