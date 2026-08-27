export const IpcChannel = {
  OpenFolders: 'folders:open',
  CloseFolder: 'folders:close',
  ReadDirectory: 'folders:read-directory',
  ReadFile: 'file:read',
  WriteFile: 'file:write',
  ReadLayout: 'layout:read',
  WriteLayout: 'layout:write',
  ReadSettings: 'settings:read',
  WriteSettings: 'settings:write',
  WriteApiKey: 'settings:write-key',
  ClearApiKey: 'settings:clear-key',
  ChatSend: 'chat:send',
  ChatCancel: 'chat:cancel',
  ChatReset: 'chat:reset',
  ChatEvent: 'chat:event'
} as const
