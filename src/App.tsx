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
          <nav class="navbar gap-3 bg-dark p-3" data-bs-theme="dark">
            <a href="#" class="navbar-brand">
              <img
                src="https://ownthehou.org/wp-content/themes/twentytwentyfive--own-the-hou/assets/images/logo-header.svg"
                style="height: 2em;"
              />
              <span>Home Finder</span>
            </a>
          </nav>
          <Loading fallback={<main class="container py-5">Loading…</main>}>
            {props.children}
          </Loading>
        </>
      )}
    </Router>
  );
}
