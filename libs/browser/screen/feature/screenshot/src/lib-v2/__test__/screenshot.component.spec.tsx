import { act } from 'react-dom/test-utils';

import { waitForRenderReady } from '@procyonidae/test';
import { fireEvent, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import dpr from '../../../dpr';
import Screenshot from '../screenshot.component';

const EMPTY_IMAGE = {
  src: '',
  width: 0,
  height: 0,
};

const FAILURE_IMAGE = {
  src: 'LOAD_FAILURE_SRC',
  width: 0,
  height: 0,
};

const SUCCESS_IMAGE = {
  src: 'LOAD_SUCCESS_SRC',
  width: 1920,
  height: 1080,
};

function setSrc(src: string) {
  if (src === FAILURE_IMAGE.src) {
    /* @ts-ignore */
    this.dispatchEvent(new Event('error'));
  } else if (src === SUCCESS_IMAGE.src) {
    /* @ts-ignore */
    this.dispatchEvent(new Event('load'));
    /* @ts-ignore */
    this.width = SUCCESS_IMAGE.width;
    /* @ts-ignore */
    this.height = SUCCESS_IMAGE.height;
  }
}

describe('ScreenshotCanvas', () => {
  beforeEach(() => {
    jest.spyOn(global.Image.prototype, 'src', 'set').mockImplementation(setSrc);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render screenshot-canvas when `image.src` is the correct image resource', () => {
    const { container } = render(
      <Screenshot
        image={SUCCESS_IMAGE.src}
        width={SUCCESS_IMAGE.width}
        height={SUCCESS_IMAGE.height}
      />,
    );

    const screenshotCanvas = container.querySelector(
      '.screenshot-canvas canvas',
    );

    expect(screenshotCanvas).not.toBeNull();
    expect(screenshotCanvas!.getAttribute('width')).toBe(
      (SUCCESS_IMAGE.width * dpr).toString(),
    );
    expect(screenshotCanvas!.getAttribute('height')).toBe(
      (SUCCESS_IMAGE.height * dpr).toString(),
    );
  });

  it('should render screenshot-canvas when `image.src` is not the correct image resource', () => {
    const { container } = render(
      <Screenshot
        image={FAILURE_IMAGE.src}
        width={FAILURE_IMAGE.width}
        height={FAILURE_IMAGE.height}
      />,
    );

    const screenshotCanvas = container.querySelector(
      '.screenshot-canvas canvas',
    );

    expect(screenshotCanvas).not.toBeNull();
    expect(screenshotCanvas?.getAttribute('width')).toBe(
      (FAILURE_IMAGE.width * dpr).toString(),
    );
    expect(screenshotCanvas?.getAttribute('height')).toBe(
      (FAILURE_IMAGE.height * dpr).toString(),
    );
  });

  it('should render screenshot-canvas when `image.src` is empty', () => {
    const { container } = render(
      <Screenshot
        image={EMPTY_IMAGE.src}
        width={EMPTY_IMAGE.width}
        height={EMPTY_IMAGE.height}
      />,
    );

    const screenshotCanvas = container.querySelector(
      '.screenshot-canvas canvas',
    );

    expect(screenshotCanvas).not.toBeNull();
    expect(screenshotCanvas?.getAttribute('width')).toBe(
      (EMPTY_IMAGE.width * dpr).toString(),
    );
    expect(screenshotCanvas?.getAttribute('height')).toBe(
      (EMPTY_IMAGE.height * dpr).toString(),
    );
  });
});

describe('ScreenshotMagnifier', () => {
  let getBoundingClientRectSpy: jest.SpyInstance<DOMRect, any>;
  let clearRectSpy: jest.SpyInstance<void, any>;
  let getImageDataSpy: jest.SpyInstance<ImageData, any>;

  beforeEach(() => {
    jest.spyOn(global.Image.prototype, 'src', 'set').mockImplementation(setSrc);

    getBoundingClientRectSpy = jest
      .spyOn(global.Element.prototype, 'getBoundingClientRect')
      .mockReturnValue({
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        top: 0,
        right: 1920,
        bottom: 1080,
        left: 0,
      } as DOMRect);

    clearRectSpy = jest.spyOn(
      global.CanvasRenderingContext2D.prototype,
      'clearRect',
    );

    getImageDataSpy = jest
      .spyOn(global.CanvasRenderingContext2D.prototype, 'getImageData')
      .mockReturnValue({
        data: [0, 0, 0],
      } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render screenshot-magnifier', async () => {
    const { container } = render(
      <Screenshot
        image={SUCCESS_IMAGE.src}
        width={SUCCESS_IMAGE.width}
        height={SUCCESS_IMAGE.height}
      />,
    );
    await waitForRenderReady();

    const screenshotCanvas = container.querySelector('.screenshot-canvas');

    act(() => {
      fireEvent.mouseMove(document, { clientX: 0, clientY: 0 });
    });

    expect(getBoundingClientRectSpy).toHaveBeenCalledTimes(1);

    act(() => {
      for (let button of [1, 2, 3, 4]) {
        // 1: Auxiliary button pressed, usually the wheel button or the middle button (if present)
        // 2: Secondary button pressed, usually the right button
        // 3: Fourth button, typically the Browser Back button
        // 4: Fifth button, typically the Browser Forward button
        fireEvent.mouseDown(screenshotCanvas!, { button });
      }

      // 0: Main button pressed, usually the left button or the un-initialized state
      fireEvent.mouseDown(screenshotCanvas!, {
        button: 0,
        clientX: 0,
        clientY: 0,
      });
    });

    expect(getImageDataSpy).toHaveBeenLastCalledWith(60, 45, 1, 1);
    expect(clearRectSpy).toHaveBeenLastCalledWith(0, 0, 120, 90);

    let magnifierEl = container.querySelector('.screenshot-magnifier');
    expect(magnifierEl).not.toBeNaN();

    let rgbEl = magnifierEl!.querySelector('.screenshot-magnifier-explain-rgb');
    expect(rgbEl).not.toBeNaN();
    expect(rgbEl!.textContent).toContain('(0,0,0)');

    act(() => {
      getImageDataSpy.mockReturnValue({
        data: [1, 1, 1],
      } as any);

      fireEvent.mouseMove(document, { clientX: 200, clientY: 200 });
    });

    expect(magnifierEl!.getAttribute('style')).toEqual(
      'transform: translate(205px, 205px);',
    );
    expect(rgbEl!.textContent).toContain('(1,1,1)');

    act(() => {
      getImageDataSpy.mockReturnValue({
        data: [2, 2, 2],
      } as any);
      fireEvent.mouseMove(document, { clientX: 400, clientY: 400 });
    });

    expect(magnifierEl!.getAttribute('style')).toBe(
      'transform: translate(405px, 405px);',
    );
    expect(rgbEl!.textContent).toContain('(2,2,2)');

    act(() => {
      getImageDataSpy.mockReturnValue({
        data: [3, 3, 3],
      } as any);
      fireEvent.mouseMove(document, { clientX: 600, clientY: 600 });
    });

    expect(magnifierEl!.getAttribute('style')).toBe(
      'transform: translate(605px, 605px);',
    );
    expect(rgbEl!.textContent).toContain('(3,3,3)');

    act(() => {
      fireEvent.mouseUp(document, { clientX: 610, clientY: 610 });
    });

    magnifierEl = container.querySelector('.screenshot-magnifier');
    expect(magnifierEl).toBeNull();
  });
});

describe('ScreenshotViewer', () => {
  beforeEach(() => {
    jest.spyOn(global.Image.prototype, 'src', 'set').mockImplementation(setSrc);

    jest
      .spyOn(global.Element.prototype, 'getBoundingClientRect')
      .mockReturnValue({
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        top: 0,
        right: 1920,
        bottom: 1080,
        left: 0,
      } as DOMRect);

    jest.spyOn(global.CanvasRenderingContext2D.prototype, 'clearRect');

    jest
      .spyOn(global.CanvasRenderingContext2D.prototype, 'getImageData')
      .mockReturnValue({
        data: [0, 0, 0],
      } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render screenshot-viewer', async () => {
    const { container } = render(
      <Screenshot
        image={SUCCESS_IMAGE.src}
        width={SUCCESS_IMAGE.width}
        height={SUCCESS_IMAGE.height}
      />,
    );
    const canvas = container.querySelector('.screenshot-canvas');
    const viewer = container.querySelector('.screenshot-viewer');
    const viewerBorder = container.querySelector('.screenshot-viewer-border');
    const viewerBar = container.querySelector('.screenshot-viewer-bar');
    const viewerBody = container.querySelector('.screenshot-viewer-body');

    await waitForRenderReady();

    act(() => {
      fireEvent.mouseDown(viewerBorder!, {});
    });

    expect(viewerBorder!.getAttribute('style')).toBe('cursor: grab;');

    act(() => {
      fireEvent.mouseMove(document, { clientX: 0, clientY: 0 });
      fireEvent.mouseDown(canvas!, {
        button: 0,
        clientX: 100,
        clientY: 100,
      });
      fireEvent.mouseMove(document, { clientX: 150, clientY: 150 });
      fireEvent.mouseUp(document, { clientX: 200, clientY: 200 });
    });

    expect(viewer!.getAttribute('style')).toBe('display: block;');

    act(() => {
      userEvent.click(viewer!, { button: 2 });
    });

    expect(viewer!.getAttribute('style')).toBe('display: none;');

    act(() => {
      fireEvent.mouseMove(document, { clientX: 0, clientY: 0 });
      fireEvent.mouseDown(canvas!, {
        button: 0,
        clientX: 100,
        clientY: 100,
      });
      fireEvent.mouseMove(document, { clientX: 150, clientY: 150 });
      fireEvent.mouseUp(document, { clientX: 200, clientY: 200 });
    });

    expect(viewer!.getAttribute('style')).toBe('display: block;');

    act(() => {
      userEvent.dblClick(viewer!, { button: 0 });
    });

    expect(viewer!.getAttribute('style')).toBe('display: none;');

    act(() => {
      fireEvent.mouseMove(document, { clientX: 0, clientY: 0 });
      fireEvent.mouseDown(canvas!, {
        button: 0,
        clientX: 100,
        clientY: 100,
      });
      fireEvent.mouseMove(document, { clientX: 150, clientY: 150 });
      fireEvent.mouseUp(document, { clientX: 200, clientY: 200 });
    });

    expect(viewer!.getAttribute('style')).toBe('display: block;');

    act(() => {
      fireEvent.mouseDown(viewerBorder!, {
        button: 0,
        clientX: 125,
        clientY: 100,
      });
    });

    expect(viewerBorder!.getAttribute('style')).toBe('cursor: grabbing;');
    expect(viewerBar!.getAttribute('style')).toContain('display: none;');
    expect(viewerBody!.getAttribute('style')).toContain(
      'left: 100px; top: 100px',
    );

    //#region Moving the viewer by dragging the border of the viewer
    act(() => {
      // Move the mouse to the top corner of the viewer
      fireEvent.mouseMove(document, { clientX: 935, clientY: 0 });
    });

    expect(viewerBody!.getAttribute('style')).toContain(
      'left: 910px; top: 0px',
    );

    act(() => {
      // Move the mouse to the top right corner of the viewer
      fireEvent.mouseMove(document, { clientX: 1745, clientY: 0 });
    });

    expect(viewerBody!.getAttribute('style')).toContain(
      'left: 1720px; top: 0px',
    );

    act(() => {
      // Move the mouse to the right corner of the viewer
      fireEvent.mouseMove(document, { clientX: 1745, clientY: 490 });
    });

    expect(viewerBody!.getAttribute('style')).toContain(
      'left: 1720px; top: 490px',
    );

    act(() => {
      // Move the mouse to the right bottom corner of the viewer
      fireEvent.mouseMove(document, { clientX: 1745, clientY: 980 });
    });

    expect(viewerBody!.getAttribute('style')).toContain(
      'left: 1720px; top: 980px',
    );

    act(() => {
      // Move the mouse to the bottom corner of the viewer
      fireEvent.mouseMove(document, { clientX: 935, clientY: 980 });
    });

    expect(viewerBody!.getAttribute('style')).toContain(
      'left: 910px; top: 980px',
    );

    act(() => {
      // Move the mouse to the left bottom left corner of the viewer
      fireEvent.mouseMove(document, { clientX: 0, clientY: 980 });
    });

    expect(viewerBody!.getAttribute('style')).toContain(
      'left: 0px; top: 980px',
    );

    act(() => {
      // Move the mouse to the left corner of the viewer
      fireEvent.mouseMove(document, { clientX: 0, clientY: 490 });
    });

    expect(viewerBody!.getAttribute('style')).toContain(
      'left: 0px; top: 490px',
    );

    act(() => {
      // Move the mouse to the left top corner of the viewer
      fireEvent.mouseMove(document, { clientX: 0, clientY: 0 });
    });

    expect(viewerBody!.getAttribute('style')).toContain('left: 0px; top: 0px');
    //#endregion

    act(() => {
      // Move the mouse to the center corner of the viewer
      fireEvent.mouseMove(document, { clientX: 935, clientY: 490 });
      fireEvent.mouseUp(document, { clientX: 935, clientY: 490 });
    });

    expect(viewerBody!.getAttribute('style')).toContain(
      'left: 910px; top: 490px',
    );

    //#region Resizing the viewer by dragging the pointer of the border
    act(() => {
      const pointer = container.querySelector('.screenshot-viewer-pointer-top');

      // Drag pointer and move it 100px to the top corner of the viewer
      fireEvent.mouseDown(pointer!, {
        button: 0,
        clientX: 960,
        clientY: 440,
      });
      fireEvent.mouseMove(document, { clientX: 960, clientY: 390 });
      fireEvent.mouseUp(document, { clientX: 960, clientY: 390 });
    });

    expect(viewerBody!.getAttribute('style')).toContain(
      'left: 910px; top: 440px; width: 100px; height: 150px',
    );

    act(() => {
      const pointer = container.querySelector(
        '.screenshot-viewer-pointer-top-right',
      );

      // Drag pointer and move it 100px to the top right corner of the viewer
      fireEvent.mouseDown(pointer!, {
        button: 0,
        clientX: 960,
        clientY: 440,
      });
      fireEvent.mouseMove(document, { clientX: 1010, clientY: 390 });
      fireEvent.mouseUp(document, { clientX: 1010, clientY: 390 });
    });

    expect(viewerBody!.getAttribute('style')).toContain(
      'left: 910px; top: 390px; width: 150px; height: 200px',
    );

    act(() => {
      const pointer = container.querySelector(
        '.screenshot-viewer-pointer-right',
      );

      // Drag pointer and move it 100px to the right corner of the viewer
      fireEvent.mouseDown(pointer!, {
        button: 0,
        clientX: 960,
        clientY: 440,
      });
      fireEvent.mouseMove(document, { clientX: 1010, clientY: 440 });
      fireEvent.mouseUp(document, { clientX: 1010, clientY: 440 });
    });

    expect(viewerBody!.getAttribute('style')).toContain(
      'left: 910px; top: 390px; width: 200px; height: 200px',
    );

    act(() => {
      const pointer = container.querySelector(
        '.screenshot-viewer-pointer-right-bottom',
      );

      // Drag pointer and move it 100px to the right bottom corner of the viewer
      fireEvent.mouseDown(pointer!, {
        button: 0,
        clientX: 960,
        clientY: 440,
      });
      fireEvent.mouseMove(document, { clientX: 1010, clientY: 490 });
      fireEvent.mouseUp(document, { clientX: 1010, clientY: 490 });
    });

    expect(viewerBody!.getAttribute('style')).toContain(
      'left: 910px; top: 390px; width: 250px; height: 250px;',
    );

    act(() => {
      const pointer = container.querySelector(
        '.screenshot-viewer-pointer-bottom',
      );

      // Drag pointer and move it 100px to the bottom corner of the viewer
      fireEvent.mouseDown(pointer!, {
        button: 0,
        clientX: 960,
        clientY: 440,
      });
      fireEvent.mouseMove(document, { clientX: 960, clientY: 490 });
      fireEvent.mouseUp(document, { clientX: 960, clientY: 490 });
    });

    expect(viewerBody!.getAttribute('style')).toContain(
      'left: 910px; top: 390px; width: 250px; height: 300px;',
    );

    act(() => {
      const pointer = container.querySelector(
        '.screenshot-viewer-pointer-bottom-left',
      );

      // Drag pointer and move it 100px to the bottom left corner of the viewer
      fireEvent.mouseDown(pointer!, {
        button: 0,
        clientX: 960,
        clientY: 440,
      });
      fireEvent.mouseMove(document, { clientX: 910, clientY: 490 });
      fireEvent.mouseUp(document, { clientX: 910, clientY: 490 });
    });

    expect(viewerBody!.getAttribute('style')).toContain(
      'left: 860px; top: 390px; width: 300px; height: 350px',
    );

    act(() => {
      const pointer = container.querySelector(
        '.screenshot-viewer-pointer-left',
      );

      // Drag pointer and move it 100px to the left corner of the viewer
      fireEvent.mouseDown(pointer!, {
        button: 0,
        clientX: 960,
        clientY: 440,
      });
      fireEvent.mouseMove(document, { clientX: 910, clientY: 440 });
      fireEvent.mouseUp(document, { clientX: 910, clientY: 440 });
    });

    expect(viewerBody!.getAttribute('style')).toContain(
      'left: 810px; top: 390px; width: 350px; height: 350px',
    );

    act(() => {
      const pointer = container.querySelector(
        '.screenshot-viewer-pointer-left-top',
      );

      // Drag pointer and move it 100px to the left top corner of the viewer
      fireEvent.mouseDown(pointer!, {
        button: 0,
        clientX: 960,
        clientY: 440,
      });
      fireEvent.mouseMove(document, { clientX: 910, clientY: 390 });
      fireEvent.mouseUp(document, { clientX: 910, clientY: 390 });
    });

    expect(viewerBody!.getAttribute('style')).toContain(
      'left: 760px; top: 340px; width: 400px; height: 400px',
    );
    //#endregion
  });

  it('Move the viewer by dragging the border', () => {});

  it('Move the viewer to the outside of the screen by dragging the border', () => {});

  it('Resize the viewer by dragging the pointer of the border', () => {});

  it('Resize the viewer to the outside of the screen by dragging the pointer of the border', () => {});
});
