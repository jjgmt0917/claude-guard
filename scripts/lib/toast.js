'use strict';
const { spawnSync } = require('child_process');

// 토스트 표시를 기다리는 최대 시간(ms)
const TOAST_TIMEOUT_MS = 10000;

// Windows PowerShell 5.1 기본 AppId (별도 등록 없이 토스트 표시 가능)
const TOAST_APP_ID = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe';

// 제목/본문은 환경변수로 넘겨 스크립트 주입을 막는다
const TOAST_SCRIPT = `
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
$xml.LoadXml("<toast><visual><binding template='ToastText02'><text id='1'/><text id='2'/></binding></visual></toast>")
$texts = $xml.GetElementsByTagName('text')
$texts.Item(0).AppendChild($xml.CreateTextNode($env:CG_TITLE)) | Out-Null
$texts.Item(1).AppendChild($xml.CreateTextNode($env:CG_BODY)) | Out-Null
$toast = New-Object Windows.UI.Notifications.ToastNotification($xml)
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($env:CG_APP_ID).Show($toast)
`;

function showToast(title, body) {
  if (process.platform !== 'win32') return;
  const encoded = Buffer.from(TOAST_SCRIPT, 'utf16le').toString('base64');
  // 비동기/분리 실행은 콘솔 창이 뜨거나 토스트가 표시되기 전에 끊겨 동기 실행한다
  spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-EncodedCommand', encoded], {
    env: { ...process.env, CG_TITLE: title, CG_BODY: body, CG_APP_ID: TOAST_APP_ID },
    windowsHide: true,
    timeout: TOAST_TIMEOUT_MS,
  });
}

module.exports = { showToast };
