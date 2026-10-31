const fs = require('fs');
const cp = require('child_process');

fs.writeFileSync('temp_prefs.xml', `<?xml version='1.0' encoding='utf-8' standalone='yes' ?>
<map>
    <string name="debug_http_host">localhost:8082</string>
</map>
`);

try {
  cp.execSync('adb -s emulator-5556 push temp_prefs.xml /data/local/tmp/temp_prefs.xml');
  cp.execSync('adb -s emulator-5556 shell "run-as com.vendormobile cp /data/local/tmp/temp_prefs.xml shared_prefs/com.vendormobile_preferences.xml"');
  console.log('✅ Successfully set debug_http_host on emulator-5556');
} catch (e) {
  console.error('Error setting debug_http_host:', e.message);
}

try {
  cp.execSync('adb -s emulator-5554 push temp_prefs.xml /data/local/tmp/temp_prefs.xml');
  cp.execSync('adb -s emulator-5554 shell "run-as com.vendormobile cp /data/local/tmp/temp_prefs.xml shared_prefs/com.vendormobile_preferences.xml"');
  console.log('✅ Successfully set debug_http_host on emulator-5554');
} catch (e) {
  console.error('Error setting debug_http_host on emulator-5554:', e.message);
}
