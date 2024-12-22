/*
  Copyright 2024 Sean M. Brennan and contributors

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

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
    css: CSSModuleClasses
    containerRef: RefObject<T>
}

export default function RepoBlogContent(props: RepoBlogContentProps<ContentContainer>) {
    return (<OverlayPanel ref={props.containerRef} showCloseIcon={true}>
                <div className={props.css.repoblog_content} dangerouslySetInnerHTML={{__html: props.html}}/>
            </OverlayPanel>)
}