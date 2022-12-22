import React, { useState } from "react";
import { Button } from "react-bootstrap";
import { ButtonProps } from "react-bootstrap/Button";


export const DownloadButton: React.FC<Omit<ButtonProps,'onClick'> & {
  getText: () => ({fileName:string, data:BlobPart[], mime:string})
  onClick?: (success:boolean) => void
}> = ({onClick, getText, children, ...restProps}) => {
  const [state, setState] = useState('no')
  if (state === 'done') {
    return <Button {...restProps}>Downloaded!</Button>
  }
  if (state === 'failed') {
    return <Button {...restProps}>Failed</Button>
  }
  return <Button {...restProps} onClick={() => {
  try {
    const {fileName, data, mime} = getText();
    const blob = new Blob(data, { type: mime });
    const link = document.createElement("a");
    if (link.download !== undefined) { // feature detection
      // Browsers that support HTML5 download attribute
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onClick && onClick(true)
      setState('done')
      setTimeout(() => setState('no'), 1500)
    } else {
      onClick && onClick(false)
      setState('failed')
      setTimeout(() => setState('no'), 1500)
    }
  } catch (e) {
    onClick && onClick(false)
    setState('failed')
    setTimeout(() => setState('no'), 1500)
  }
  }}>{children}</Button>
}