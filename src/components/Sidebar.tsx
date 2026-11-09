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
    <button class="btn" style={{'margin-top': '-0.3em'}} onClick={() => setDrawerState({ open: !drawerState().open })}>
      <svg width="24px" height="24px" viewBox="0 0 800 800" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <title>maps-and-flags-map-svgrepo-com</title>
          <g id="Page-1" stroke="none" stroke-width="14" fill="none" fill-rule="evenodd">
              <g id="maps-and-flags-map-svgrepo-com" transform="translate(0.003125, 0.000000)" fill="#FFF" fill-rule="nonzero">
                  <path d="M791.414062,195.528125 L728.389063,173.120312 C721.676563,170.726562 714.296875,174.239062 711.909375,180.954687 C709.521875,187.671875 713.029687,195.046875 719.74375,197.434375 L774.189062,216.792187 L774.189062,768.8125 L606.446875,709.171875 L606.446875,452.395312 C606.446875,445.267187 600.670312,439.492188 593.54375,439.492188 C586.417187,439.492188 580.640625,445.267187 580.640625,452.395312 L580.640625,709.171875 L412.898437,768.8125 L412.898437,452.403125 C412.898437,445.275 407.121875,439.5 399.995312,439.5 C392.86875,439.5 387.092187,445.275 387.092187,452.403125 L387.092187,768.8125 L219.35,709.171875 L219.35,259.3 C219.35,252.171875 213.573437,246.396875 206.446875,246.396875 C199.320312,246.396875 193.54375,252.171875 193.54375,259.3 L193.54375,709.171875 L25.8046875,768.8125 L25.8046875,216.792187 L193.546875,157.15 L193.546875,207.685938 C193.546875,214.814063 199.323438,220.589063 206.45,220.589063 C213.576562,220.589063 219.353125,214.814063 219.353125,207.685938 L219.353125,157.15 L267.482812,174.260938 C274.196875,176.654688 281.576563,173.142188 283.9625,166.426563 C286.35,159.7125 282.842188,152.334375 276.128125,149.946875 L210.775,126.710938 C210.7375,126.696875 210.696875,126.69375 210.660937,126.679688 C210.04375,126.465625 209.404687,126.298438 208.75,126.179688 C208.651562,126.1625 208.553125,126.15 208.457812,126.134375 C207.804687,126.03125 207.1375,125.9625 206.453125,125.9625 L206.453125,125.9625 L206.45,125.9625 C205.767187,125.9625 205.103125,126.03125 204.448437,126.132813 C204.348437,126.148438 204.25,126.160938 204.153125,126.178125 C203.498437,126.296875 202.860937,126.465625 202.24375,126.678125 C202.20625,126.692188 202.165625,126.695313 202.129687,126.709375 L8.5796875,195.526562 C3.4359375,197.354687 0,202.223437 0,207.682812 L0,787.095312 C0,791.289062 2.0375,795.220312 5.4625,797.6375 C8.8890625,800.053125 13.2765625,800.6625 17.225,799.251562 L206.45,731.971875 L395.675,799.251562 C395.7125,799.265625 395.753125,799.26875 395.790625,799.282812 C396.407812,799.496875 397.045312,799.664062 397.7,799.78125 C397.798437,799.8 397.898438,799.8125 397.995312,799.826562 C398.648438,799.929687 399.315625,799.999963 399.998437,799.999963 C400.68125,799.999963 401.346875,799.929687 402.001562,799.826562 C402.1,799.810937 402.2,799.798437 402.296875,799.78125 C402.951562,799.664062 403.589062,799.495312 404.20625,799.282812 C404.24375,799.26875 404.284375,799.265625 404.321875,799.251562 L593.546875,731.971875 L782.771875,799.251562 C784.179688,799.751562 785.639062,799.999963 787.09375,799.999963 C789.725,799.999963 792.329687,799.19375 794.534375,797.6375 C797.959375,795.220312 799.996875,791.289062 799.996875,787.095312 L799.996875,207.685937 C799.996875,202.226562 796.557812,197.35625 791.414062,195.528125 Z" id="Path"></path>
                  <path d="M471.796875,467.310937 C478.798437,473.057813 487.782812,475.928125 496.770312,475.928125 C505.754687,475.928125 514.742188,473.054688 521.742188,467.3125 C523.398438,465.953125 562.779688,433.440625 602.6875,383.026563 C656.965625,314.459375 684.484375,248.745313 684.484375,187.717187 C684.484375,84.2078125 600.276562,0 496.770312,0 C393.264063,0 309.053125,84.2078125 309.053125,187.715625 C309.053125,248.745313 336.575,314.457812 390.851562,383.025 C430.759375,433.440625 470.140625,465.951562 471.796875,467.310937 Z M496.770312,25.80625 C586.048437,25.80625 658.679688,98.4390625 658.679688,187.715625 C658.679688,319.86875 506.903125,446.103125 505.373438,447.360937 C500.867188,451.053125 492.665625,451.05625 488.167188,447.3625 C486.634375,446.103125 334.857813,319.870313 334.857813,187.715625 C334.857813,98.4390625 407.492188,25.80625 496.770312,25.80625 Z" id="Shape"></path>
                  <path d="M597.621875,187.715625 C597.621875,132.104688 552.379688,86.8625 496.76875,86.8625 C441.157812,86.8625 395.915625,132.104688 395.915625,187.715625 C395.915625,243.326563 441.157812,288.56875 496.76875,288.56875 C552.379688,288.56875 597.621875,243.328125 597.621875,187.715625 Z M421.721875,187.715625 C421.721875,146.334375 455.3875,112.66875 496.76875,112.66875 C538.148438,112.66875 571.815625,146.334375 571.815625,187.715625 C571.815625,229.096875 538.15,262.7625 496.76875,262.7625 C455.389063,262.7625 421.721875,229.096875 421.721875,187.715625 Z" id="Shape"></path>
              </g>
          </g>
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
      data-open={drawerState().open && 'open' || 'close'}
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