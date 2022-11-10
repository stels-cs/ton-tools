import { useRouteNode } from "react-router5";
import React from "react";
import ExportTransactionHistory from "./pages/ExportTransactionHistory";

const App = React.lazy(() => import("./pages/App"));
const Address = React.lazy(() => import("./pages/Address"));


const Pages: React.FC<{}> = (props) => {
  const { route } = useRouteNode('');
  const name = (route || {}).name
  return <>
    {name === 'main' && <App />}
    {name === 'address' && <Address />}
    {name === 'csv' && <ExportTransactionHistory />}
  </>
}

export default Pages