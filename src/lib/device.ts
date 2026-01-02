import { UAParser } from 'ua-parser-js';

export interface DeviceInfo {
  ip: string;
  browser: string;
  os: string;
  deviceType: string;
  userAgent: string;
  fingerprint: string;
}

export async function getDeviceInfo(): Promise<DeviceInfo> {
  const parser = new UAParser();
  const result = parser.getResult();

  let ip = 'Unknown';
  try {
    const ipResponse = await fetch('https://api.ipify.org?format=json');
    const ipData = await ipResponse.json();
    ip = ipData.ip;
  } catch (error) {
    console.error('Failed to fetch IP address:', error);
  }

  const browser = result.browser.name || 'Unknown Browser';
  const browserVersion = result.browser.version || '';
  const os = result.os.name || 'Unknown OS';
  const osVersion = result.os.version || '';
  const deviceType = result.device.type || 'desktop';
  const userAgent = navigator.userAgent;

  const fingerprint = generateFingerprint(browser, browserVersion, os, osVersion, userAgent);

  return {
    ip,
    browser: `${browser} ${browserVersion}`.trim(),
    os: `${os} ${osVersion}`.trim(),
    deviceType,
    userAgent,
    fingerprint
  };
}

function generateFingerprint(
  browser: string,
  browserVersion: string,
  os: string,
  osVersion: string,
  userAgent: string
): string {
  const components = [
    browser,
    browserVersion,
    os,
    osVersion,
    userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset()
  ].join('|');

  return btoa(components).substring(0, 64);
}
