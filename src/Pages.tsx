import { useRouteNode } from "react-router5";
import React from "react";

const App = React.lazy(() => import("./pages/App"));
const Address = React.lazy(() => import("./pages/Address"));


export const Pages: React.FC<{}> = (props) => {
  const { route } = useRouteNode('');
  const name = (route || {}).name
  return <>
    {name === 'main' && <App />}
    {name === 'address' && <Address />}
  </>
}