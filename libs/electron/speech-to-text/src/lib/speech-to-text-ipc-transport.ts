import {
  ElectronContextBridge,
  SpeechToTextResponse,
} from '@procyonidae/api-interfaces';
import { ipcMain, ipcRenderer } from 'electron';

import { SpeechToText } from './speech-to-text';
import { SpeechToTextIpcKeys } from './speech-to-text-ipc-keys';

export type SpeechToTextKey = 'speechToText';

export type SpeechToTextContextBridge = ElectronContextBridge[SpeechToTextKey];

export const getSpeechToTextContextBridge = () => {
  const speechToText: SpeechToTextContextBridge = {
    selectFile: () => ipcRenderer.invoke(SpeechToTextIpcKeys.selectFile),
    saveFile: (list) => ipcRenderer.invoke(SpeechToTextIpcKeys.saveFile, list),
    setServiceAccountFile: () =>
      ipcRenderer.invoke(SpeechToTextIpcKeys.setServiceAccountFile),
  };

  return { speechToText };
};

let dataTmp;

export const bindSpeechToTextIpcListeners = () => {
  ipcMain.handle(SpeechToTextIpcKeys.selectFile, async (e, value: string) => {
    const speechToText = SpeechToText.getInstance();

    const filePath = await speechToText.selectFile();

    if (filePath) {
      const result = await speechToText.getTextFromAudio(filePath);
      const text = speechToText.responseToString(result);
      const data = speechToText.responseToSrt(result);
      // dataTmp = data;
      return { text, data };
      // return { text: '', data: '' };
    }

    return { text: '', data: [] };
  });

  ipcMain.handle(
    SpeechToTextIpcKeys.saveFile,
    async (e, list: SpeechToTextResponse[]) => {
      const speechToText = SpeechToText.getInstance();

      const filePath = await speechToText.saveFile(list);

      return filePath;
    },
  );

  ipcMain.handle(SpeechToTextIpcKeys.setServiceAccountFile, (e) => {
    const speechToText = SpeechToText.getInstance();

    speechToText.setServiceAccountPath();

    return true;
  });
};
