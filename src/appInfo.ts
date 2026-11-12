// Nguồn sự thật duy nhất của phiên bản app: lấy trực tiếp từ package.json
// (`yarn upd` sẽ cập nhật package.json -> splash & màn hình Giới thiệu tự đổi theo)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pkg = require('../package.json') as { name: string; version: string };

export const APP_NAME = 'AutoRingtone';
export const APP_VERSION: string = pkg.version;
export const APP_VERSION_LABEL = `Phiên bản ${pkg.version}`;

