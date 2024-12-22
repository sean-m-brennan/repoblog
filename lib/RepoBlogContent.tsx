import { RefObject, SyntheticEvent } from "react"

import { OverlayPanel } from "primereact/overlaypanel"  // FIXME remove

interface RBCContainer {
    show: (event: SyntheticEvent | undefined | null, target: HTMLElement | EventTarget | undefined | null) => void
    hide: () => void
}

export type ContentContainer = OverlayPanel
// FIXME <div id="mypopover" popover>content</div>
// FIXME with a close button

export type RepoBlogContentProps<T extends RBCContainer> = {
    html: string
    containerRef: RefObject<T>
}

export default function RepoBlogContent(props: RepoBlogContentProps<ContentContainer>) {
    return (<OverlayPanel ref={props.containerRef} showCloseIcon={true}
                          style={{width:'100%', height:'100%', backgroundColor:'#fff'}}>
                <div dangerouslySetInnerHTML={{__html: props.html}}/>
            </OverlayPanel>)
}