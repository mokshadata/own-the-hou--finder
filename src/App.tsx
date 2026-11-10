import { Title } from '@solidjs/meta';
import { Loading } from 'solid-js';
import 'bootstrap/dist/css/bootstrap.min.css';

import { paths, Router } from './router';
import { ListingsLayout } from './routes/own-the-hou--finder';

import './App.css';

export default function App() {
  return (
    <Router>
      {(props) => (
        <>
          <Title>Own the HOU: Home Finder</Title>
          <ListingsLayout>
          <Loading fallback={<main class="p-4">Loading...</main>}>
            {props.children}
            </Loading>
          </ListingsLayout>
        </>
      )}
    </Router>
  );
}
