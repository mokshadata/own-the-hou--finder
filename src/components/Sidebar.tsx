import { Drawer } from 'bootstrap';
import { createSignal, onSettled, useContext, createContext, createEffect } from 'solid-js';
import type { ParentProps, ParentComponent, Component, ComponentProps, Element } from 'solid-js';
import type * as CSS from 'csstype';

export interface DrawerProps extends ParentProps {
  scroll: boolean, 
  backdrop: boolean,
  class?: string,
  style?: {},
  label: string,
  tabindex: number,

  header?: Element,
  footer?: Element,
}

export interface FinderDrawerState {
  open: boolean,
}
export type FinderDrawerContextValue = ReturnType<typeof createFinderDrawer>

export function createFinderDrawer() {
  const [drawerState, setDrawerState] = createSignal<FinderDrawerState>({ open: true })
  return { drawerState, setDrawerState }
}

export const FinderDrawerContext = createContext<FinderDrawerContextValue>()

export function useFinderDrawer() {
  return useContext(FinderDrawerContext)
}

export const FinderDrawerProvider: ParentComponent<ParentProps> = (props) => {
  return <FinderDrawerContext value={createFinderDrawer()}>{props.children}</FinderDrawerContext>
}

export const FinderController: Component = (props) => {
  const { drawerState, setDrawerState } = useFinderDrawer()

  return (
    <button class="btn bg-transparent p-1" style={{'margin-top': '-0.3em'}} onClick={() => setDrawerState({ open: !drawerState().open })}>
      <svg
        width="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="size-4"
      >
        <rect width="18" height="18" x="3" y="3" rx="2"></rect>
        <path d="M9 3v18"></path>
      </svg>
    </button>
  );

}

export const FinderDrawerPanel: ParentComponent<ParentProps> = (props) => {
  const { drawerState, setDrawerState } = useFinderDrawer()

  return (<main data-finder-drawer-panel={drawerState().open && 'opened' || 'closed'}>
    {props.children}
  </main>)
}


export const FinderDrawer: ParentComponent<DrawerProps> = ({
  scroll=true,
  backdrop=false,
  style={},
  tabindex=-1,

  ...props
}) => {

  const { drawerState, setDrawerState } = useFinderDrawer()

  let dialogElement
  let drawerBootstrap

  onSettled(() => {
    drawerBootstrap = new Drawer(dialogElement)
  })

  return (
    <dialog
      ref={dialogElement}
      class={`drawer drawer-end ${props.class && props.class || ''} ${drawerState().open && 'show'}`}
      open={drawerState().open}
      style={style}
      data-bs-scroll={scroll && 'true' || 'false'}
      data-bs-backdrop={backdrop && 'true' || 'false'}
      tabindex={`${tabindex}`}
      id={`${props.label}`}
      aria-labelledby={`${props.label}-label`}
    >
      {props.header && (<div class="drawer-header">
        {props.header}
      </div>)}
      {props.children && (<div class="drawer-body">
        {props.children}
      </div>)}
      {props.footer && (<div class="drawer-footer">
        {props.footer}
      </div>)}
    </dialog>
  )
}