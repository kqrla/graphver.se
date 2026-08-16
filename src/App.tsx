import { useEffect, useState } from 'react';
import GraphEditor from './components/GraphEditor';
import EmbedView from './components/EmbedView';

function App() {
  const [mode, setMode] = useState<'editor' | 'embed'>('editor');
  const [boardId, setBoardId] = useState<string | undefined>();

  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);

    if (path.startsWith('/embed/')) {
      setMode('embed');
      setBoardId(path.replace('/embed/', ''));
    } else if (params.get('board')) {
      setMode('editor');
      setBoardId(params.get('board') || undefined);
    } else {
      setMode('editor');
    }
  }, []);

  if (mode === 'embed' && boardId) {
    return <EmbedView boardId={boardId} />;
  }

  return <GraphEditor boardId={boardId} />;
}

export default App;
