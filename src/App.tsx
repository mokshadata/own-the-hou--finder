import { Title } from '@solidjs/meta';
import { Loading } from 'solid-js';
import 'bootstrap/dist/css/bootstrap.min.css';
import { paths, Router } from './router';
import './App.css';

export default function App() {
  return (
    <Router>
      {(props) => (
        <>
          <Title>Own the HOU: Home Finder</Title>
          <nav class="navbar justify-content-center gap-3 bg-dark p-3" data-bs-theme="dark">
          </nav>
          <Loading fallback={<main class="container py-5">Loading…</main>}>
            {props.children}
          </Loading>
        </>
      )}
    </Router>
  );
}
