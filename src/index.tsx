import 'bootstrap/dist/css/bootstrap.min.css';
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import reportWebVitals from './reportWebVitals';
import { Buffer } from 'buffer';
import configureRouter from "./routes";
import { RouterProvider } from "react-router5";
import { ThemeProvider } from "react-bootstrap";

const Pages = React.lazy(() => import('./Pages'))

window.Buffer = window.Buffer || Buffer;

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
const router = configureRouter()
router.start()
root.render(
  <React.StrictMode>
    <RouterProvider router={router}>
      <Suspense fallback={<div>Loading</div>}>
        <ThemeProvider
          breakpoints={['xxxl', 'xxl', 'xl', 'lg', 'md', 'sm', 'xs', 'xxs']}
          minBreakpoint="xxs"
        >
        <Pages />
        </ThemeProvider>
      </Suspense>
    </RouterProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
