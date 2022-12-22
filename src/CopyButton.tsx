import React, { useState } from "react";
import { Button } from "react-bootstrap";
import { ButtonProps } from "react-bootstrap/Button";


export const CopyButton: React.FC<Omit<ButtonProps,'onClick'> & {
  getText: () => string
  onClick?: (success:boolean) => void
}> = ({onClick, getText, children, ...restProps}) => {
  const [state, setState] = useState('no')
  if (state === 'done') {
    return <Button {...restProps}>Copied!</Button>
  }
  if (state === 'failed') {
    return <Button {...restProps}>Failed</Button>
  }
  return <Button {...restProps} onClick={() => {
  try {
    navigator.clipboard.writeText(getText()).then(
      () => {
        onClick && onClick(true)
        setState('done')
        setTimeout(() => setState('no'), 1500)
      },
      () => {
        onClick && onClick(false)
        setState('failed')
        setTimeout(() => setState('no'), 1500)
      }
    );
  } catch (e) {
    onClick && onClick(false)
    setState('failed')
    setTimeout(() => setState('no'), 1500)
  }
  }}>{children}</Button>
}