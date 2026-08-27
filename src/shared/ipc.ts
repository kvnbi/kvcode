export const IpcChannel = {
  OpenFolders: 'folders:open',
  CloseFolder: 'folders:close',
  ReadDirectory: 'folders:read-directory',
  ReadFile: 'file:read',
  WriteFile: 'file:write',
  ReadLayout: 'layout:read',
  WriteLayout: 'layout:write'
} as const
