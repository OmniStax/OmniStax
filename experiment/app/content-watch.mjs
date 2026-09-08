/* Dev only: a change under the content root (section text, figures, exercises,
   chapter data) reloads the open page, the way an edit to a component does. */
import path from 'node:path';
export default function contentWatch(root) {
  return {
    name: 'omnistax-content-watch',
    hooks: {
      'astro:server:setup': ({ server }) => {
        server.watcher.add(root);
        const onChange = (file) => { if (file.startsWith(root) && !file.includes(`${path.sep}app${path.sep}`)) server.ws.send({ type: 'full-reload', path: '*' }); };
        server.watcher.on('change', onChange); server.watcher.on('add', onChange); server.watcher.on('unlink', onChange);
      },
    },
  };
}
