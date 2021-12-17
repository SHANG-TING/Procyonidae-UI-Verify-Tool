import { render } from '@testing-library/react';

import BrowserSnippetsFeature from './browser-snippets-feature';

describe('BrowserSnippetsFeature', () => {
  it.skip('should render successfully', () => {
    const { baseElement } = render(<BrowserSnippetsFeature />);
    expect(baseElement).toBeTruthy();
  });
});
