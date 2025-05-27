import "./mvp.css";
import "./style.css";

const canvasGlo = document.getElementById("cnv") as HTMLCanvasElement;
const ctxGlo = canvasGlo!.getContext("2d");
let fr: HTMLImageElement[] = [];
function analDone(frames: HTMLImageElement[]) {
  console.log(frames);
  fr = frames;
}

function rerender1_opacity() {
  const st = parseInt(
    (document.getElementById("sf")! as HTMLInputElement).value
  );
  const ed = parseInt(
    (document.getElementById("ed")! as HTMLInputElement).value
  );

  ctxGlo?.clearRect(0, 0, canvasGlo.width, canvasGlo.height);
  const cnt = ed - st + 1;
  ctxGlo!.globalAlpha = 1 / cnt;

  for (let i = st; i <= ed; i++) {
    ctxGlo?.drawImage(fr[i], 0, 0);
  }
}

function rerender0_rgb_gen(th: number) {
  return () => {
    if (!ctxGlo) {
      return;
    }

    const sfInput = document.getElementById("sf") as HTMLInputElement;
    const edInput = document.getElementById("ed") as HTMLInputElement;

    if (!sfInput || !edInput) {
      return;
    }

    const st = parseInt(sfInput.value);
    const ed = parseInt(edInput.value);

    if (isNaN(st) || isNaN(ed)) {
      ctxGlo.clearRect(0, 0, canvasGlo.width, canvasGlo.height);
      return;
    }

    if (fr.length === 0) {
      ctxGlo.clearRect(0, 0, canvasGlo.width, canvasGlo.height);
      return;
    }

    const maxFrameIndex = fr.length - 1;
    const clampedSt = Math.max(0, Math.min(st, maxFrameIndex));
    const clampedEd = Math.max(0, Math.min(ed, maxFrameIndex));

    if (clampedSt > clampedEd) {
      ctxGlo.clearRect(0, 0, canvasGlo.width, canvasGlo.height);
      return;
    }

    ctxGlo.clearRect(0, 0, canvasGlo.width, canvasGlo.height);

    // Ensure the base frame image exists
    if (!fr[clampedSt]) {
      console.error("Base frame image is missing.");
      return;
    }

    // 1. Draw the base frame (fr[clampedSt]) completely. This is our reference background.
    ctxGlo.globalCompositeOperation = "source-over";
    ctxGlo.globalAlpha = 1.0;
    ctxGlo.drawImage(fr[clampedSt], 0, 0, canvasGlo.width, canvasGlo.height);

    // If only one frame is selected (start equals end), or no subsequent frames, we are done.
    if (clampedSt >= clampedEd) {
      return;
    }

    // 2. Prepare for pixel comparison against the base frame.
    const frameWidth = canvasGlo.width;
    const frameHeight = canvasGlo.height;
    const pixelDiffThreshold = th; // Adjust this threshold as needed

    // Temporary canvas to get pixel data of the base/background frame (fr[clampedSt]).
    const tempCanvasBase = document.createElement("canvas");
    tempCanvasBase.width = frameWidth;
    tempCanvasBase.height = frameHeight;
    const tempCtxBase = tempCanvasBase.getContext("2d", {
      willReadFrequently: true,
    });

    if (!tempCtxBase) {
      console.error(
        "Failed to create temporary canvas context for base frame."
      );
      return; // Base frame is drawn, but cannot proceed with diffing.
    }
    tempCtxBase.drawImage(fr[clampedSt], 0, 0, frameWidth, frameHeight);
    const baseImageData = tempCtxBase.getImageData(
      0,
      0,
      frameWidth,
      frameHeight
    ).data;

    // Temporary canvas for current frames being processed.
    const tempCanvasCurr = document.createElement("canvas");
    tempCanvasCurr.width = frameWidth;
    tempCanvasCurr.height = frameHeight;
    const tempCtxCurr = tempCanvasCurr.getContext("2d", {
      willReadFrequently: true,
    });

    if (!tempCtxCurr) {
      console.error(
        "Failed to create temporary canvas context for current frame."
      );
      return;
    }

    // Set drawing properties for changed pixels on the main canvas (ctxGlo).
    // globalAlpha is effectively 1.0 for fillRect, actual alpha is in fillStyle.
    // globalCompositeOperation is 'source-over' (default), drawing on top.

    // 3. For subsequent frames, draw only pixels that differ from the base/background frame.
    for (let i = clampedSt + 1; i <= clampedEd; i++) {
      const currFrameImg = fr[i];

      if (!currFrameImg) {
        console.warn(`Skipping frame ${i} due to missing image data.`);
        continue;
      }

      // Draw current frame to tempCanvasCurr to get its pixel data
      tempCtxCurr.clearRect(0, 0, frameWidth, frameHeight);
      tempCtxCurr.drawImage(currFrameImg, 0, 0, frameWidth, frameHeight);
      const currImageData = tempCtxCurr.getImageData(
        0,
        0,
        frameWidth,
        frameHeight
      ).data;

      // Compare pixels of current frame with the base frame's pixels
      for (let y = 0; y < frameHeight; y++) {
        for (let x = 0; x < frameWidth; x++) {
          const idx = (y * frameWidth + x) * 4; // Index for R, G, B, A components

          const rBase = baseImageData[idx];
          const gBase = baseImageData[idx + 1];
          const bBase = baseImageData[idx + 2];
          // const aBase = baseImageData[idx + 3]; // Alpha of base pixel

          const rCurr = currImageData[idx];
          const gCurr = currImageData[idx + 1];
          const bCurr = currImageData[idx + 2];
          const aCurr = currImageData[idx + 3]; // Alpha of current pixel

          // If current pixel is fully transparent, it won't change appearance or hide anything.
          if (aCurr === 0) {
            continue;
          }

          const diffR = Math.abs(rCurr - rBase);
          const diffG = Math.abs(gCurr - gBase);
          const diffB = Math.abs(bCurr - bBase);
          const avgDiff = (diffR + diffG + diffB) / 3;

          if (avgDiff > pixelDiffThreshold) {
            // If significantly different from base, draw this pixel from current frame.
            // Use the current pixel's own color and alpha.
            ctxGlo.fillStyle = `rgb(${rCurr}, ${gCurr}, ${bCurr})`;
            ctxGlo.fillRect(x, y, 1, 1);
          }
          // Else (pixel is similar to base): do nothing. The base frame's pixel is already visible.
        }
      }
    }

    // Reset global canvas properties to defaults, though they should be in correct state.
    ctxGlo.globalCompositeOperation = "source-over";
    ctxGlo.globalAlpha = 1.0;
  };
}

const renderMethods = [
  rerender0_rgb_gen(10),
  rerender0_rgb_gen(20),
  rerender0_rgb_gen(30),
  rerender0_rgb_gen(40),
  rerender0_rgb_gen(50),
  rerender1_opacity,
];

function rerender() {
  const sel = document.getElementById("render") as HTMLSelectElement;
  if (!sel) return;
  const methodIndex = sel.selectedIndex;
  if (methodIndex < 0 || methodIndex >= renderMethods.length) {
    console.error("Invalid render method selected.");
    return;
  }
  const renderMethod = renderMethods[methodIndex];
  if (typeof renderMethod !== "function") {
    console.error("Selected render method is not a function.");
    return;
  }
  renderMethod();
  console.log(`Rerendered using method ${methodIndex}`);
}

document.getElementById("sfp")?.addEventListener("click", () => {
  const sf = document.getElementById("sf") as HTMLInputElement;
  if (!sf) return;
  sf.value = Math.max(parseInt(sf.value) - 1, 0).toString();
  // rerender();
});
document.getElementById("sfm")?.addEventListener("click", () => {
  const sf = document.getElementById("sf") as HTMLInputElement;
  if (!sf) return;
  // Ensure new value does not exceed total frames - 1
  const newValue = Math.min(
    parseInt(sf.value) + 1,
    fr.length > 0 ? fr.length - 1 : 0
  );
  sf.value = newValue.toString();
  // rerender();
});
document.getElementById("edp")?.addEventListener("click", () => {
  const edEl = document.getElementById("ed") as HTMLInputElement; // Corrected variable name
  if (!edEl) return;
  edEl.value = Math.max(parseInt(edEl.value) - 1, 0).toString();
  // rerender();
});
document.getElementById("edm")?.addEventListener("click", () => {
  const edEl = document.getElementById("ed") as HTMLInputElement; // Corrected variable name
  if (!edEl) return;
  // Ensure new value does not exceed total frames - 1
  const newValue = Math.min(
    parseInt(edEl.value) + 1,
    fr.length > 0 ? fr.length - 1 : 0
  );
  edEl.value = newValue.toString();
  // rerender();
});
document.getElementById("rerender")?.addEventListener("click", () => {
  document.getElementById("rerender")!.innerText = "리렌더링 중...";
  setTimeout(() => {
    rerender();
    document.getElementById("rerender")!.innerText = "다시 생성";
  }, 100);
});

function updateBtnName(desc: string) {
  const btn = document.getElementById("anal");
  if (!btn) return;
  btn.innerText = `프레임 추출중 (${desc})`;
}
function updateBtnNameDone() {
  const btn = document.getElementById("anal");
  if (!btn) return;
  btn.innerText = `프레임 추출 시작`;
}

function anal() {
  const file = document.getElementById("file");
  if (!file) return;
  const files = (file as HTMLInputElement).files;
  if (files == null) return;
  if (files.length == 0) return;
  const video = files.item(0);
  if (!video) return;

  const cutMsEl = document.getElementById("cut") as HTMLInputElement;
  if (!cutMsEl) return;
  const cutMS = parseInt(cutMsEl.value);
  if (!cutMS) return;
  if (Number.isNaN(cutMS)) return;

  const videoURL = URL.createObjectURL(video);
  const videoElement = document.createElement("video");
  videoElement.controls = true;
  videoElement.src = videoURL;

  let frames: HTMLImageElement[] = [];

  // extract frame from every cutMS
  videoElement.addEventListener("loadedmetadata", () => {
    const width = videoElement.videoWidth;
    const height = videoElement.videoHeight;
    const durationMs = videoElement.duration * 1000;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    let currentTimeMs = 0;

    const grabFrame = () => {
      videoElement.currentTime = currentTimeMs / 1000;
    };

    const imageCount = Math.floor(durationMs / cutMS);
    const ed = document.getElementById("ed") as HTMLInputElement;
    if (ed) ed.value = (imageCount > 0 ? imageCount - 1 : 0).toString(); // Set initial end frame to last index
    const sf = document.getElementById("sf") as HTMLInputElement;
    if (sf) sf.value = "0"; // Set initial start frame to 0

    const opa = 1 / imageCount;
    canvasGlo.width = width;
    canvasGlo.height = height;
    ctxGlo!.globalAlpha = opa;
    ctxGlo?.clearRect(0, 0, width, height);

    const onSeeked = () => {
      if (!ctx) return;
      ctx.drawImage(videoElement, 0, 0, width, height);
      ctxGlo!.drawImage(videoElement, 0, 0, width, height);
      const img = document.createElement("img");
      img.src = canvas.toDataURL("image/png");
      frames.push(img);

      currentTimeMs += cutMS;
      if (currentTimeMs <= durationMs) {
        grabFrame();
        updateBtnName(`${Math.floor((currentTimeMs / durationMs) * 100)}%`);
      } else {
        videoElement.removeEventListener("seeked", onSeeked);
        // done caller
        analDone(frames);
        updateBtnNameDone();
        rerender(); // Initial render after analysis
      }
    };

    videoElement.addEventListener("seeked", onSeeked);
    grabFrame();
  });
}

document.getElementById("anal")?.addEventListener("click", () => {
  anal();
});
