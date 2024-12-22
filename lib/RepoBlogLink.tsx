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

import {RepoEntry} from "./RepoBlogConfig"
import defaultImage from "./article.png"

export type LinkAction = (target: EventTarget, entry: RepoEntry) => void

export type RepoBlogLinkProps = {
    entry: RepoEntry
    css: CSSModuleClasses
    action: LinkAction
}

export default function RepoBlogLink({entry, css, action}: RepoBlogLinkProps) {
    const title = entry.header.title ? entry.header.title : entry.name
    const image = entry.header.image ? entry.header.image : defaultImage
    return (<div className={css.repoblog_link}>
        <button style={{width: "200px", height: "200px", backgroundColor: "transparent", border: "none"}} >
            <img src={image} alt={title}
                 style={{maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto"}}
                 onClick={(e) => action(e.currentTarget, entry)}
            />
            {title}
        </button>
    </div>)
}
