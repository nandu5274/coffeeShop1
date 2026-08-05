import * as process from 'process/browser';

(window as any).process = process;

// Belt-and-suspenders with index.html: remap unload → pagehide before Zone/SockJS.
(() => {
  const proto = EventTarget?.prototype as EventTarget & { __kuberaUnloadRemap?: boolean };
  if (!proto || proto.__kuberaUnloadRemap) return;
  const origAdd = proto.addEventListener;
  const origRemove = proto.removeEventListener;
  proto.addEventListener = function (type: any, listener: any, options?: any) {
    if (type === 'unload') type = 'pagehide';
    return origAdd.call(this, type, listener, options);
  };
  proto.removeEventListener = function (type: any, listener: any, options?: any) {
    if (type === 'unload') type = 'pagehide';
    return origRemove.call(this, type, listener, options);
  };
  proto.__kuberaUnloadRemap = true;
})();