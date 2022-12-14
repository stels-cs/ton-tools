import createRouter from 'router5'
import loggerPlugin from 'router5-plugin-logger'
import browserPlugin from 'router5-plugin-browser'


const routes =  [
  { name: 'address', path: '/' },
  { name: 'main', path: '/main' },
  { name: 'csv', path: '/csv' },
]

export default function configureRouter() {
  const router = createRouter(routes, {
    defaultRoute: 'main'
  })

  router.usePlugin(loggerPlugin)

  router.usePlugin(browserPlugin({
    useHash: true,
  }))

  return router
}