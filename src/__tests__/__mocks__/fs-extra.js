// Mock for fs-extra module to handle Jest testing environment

const fileContents = new Map();
const fileExistsMap = new Map();

const resetFileSystem = () => {
  fileContents.clear();
  fileExistsMap.clear();
};

const mockedEnsureDir = jest.fn(async (dirPath) => {
  return Promise.resolve();
});

const mockedWriteJson = jest.fn(async (filePath, data, options) => {
  fileContents.set(filePath, data);
  fileExistsMap.set(filePath, true);
  return Promise.resolve();
});

const mockedPathExists = jest.fn(async (filePath) => {
  return Promise.resolve(fileExistsMap.has(filePath) ? fileExistsMap.get(filePath) : false);
});

const mockedPathExistsSync = jest.fn((filePath) => {
  return fileExistsMap.has(filePath) ? fileExistsMap.get(filePath) : false;
});

const mockedReadJsonSync = jest.fn((filePath) => {
  if (fileContents.has(filePath)) {
    return fileContents.get(filePath);
  }
  return {};
});

const mockedUnlink = jest.fn(async (filePath) => {
  fileExistsMap.set(filePath, false);
  fileContents.delete(filePath);
  return Promise.resolve();
});

const mockedUnlinkSync = jest.fn((filePath) => {
  fileExistsMap.set(filePath, false);
  fileContents.delete(filePath);
});

const mockedWriteFileSync = jest.fn((filePath, data) => {
  fileContents.set(filePath, JSON.parse(data));
  fileExistsMap.set(filePath, true);
});

const mockedReadFileSync = jest.fn((filePath, options) => {
  if (fileContents.has(filePath)) {
    return JSON.stringify(fileContents.get(filePath));
  }
  return '{}';
});

module.exports = {
  ensureDir: mockedEnsureDir,
  pathExists: mockedPathExists,
  unlink: mockedUnlink,
  writeJson: mockedWriteJson,
  writeJSON: mockedWriteJson,
  readJson: jest.fn(async (filePath) => {
    if (fileContents.has(filePath)) {
      return fileContents.get(filePath);
    }
    return {};
  }),
  readJsonSync: mockedReadJsonSync,
  pathExistsSync: mockedPathExistsSync,
  unlinkSync: mockedUnlinkSync,
  writeFileSync: mockedWriteFileSync,
  readFileSync: mockedReadFileSync,
  readFile: jest.fn(() => Promise.resolve(Buffer.from(''))),
};