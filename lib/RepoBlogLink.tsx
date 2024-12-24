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

import {HeaderInfo, RepoEntry} from "./RepoBlogConfig"
import defaultImage from "./article.png"

export type LinkAction = (target: EventTarget, entry: RepoEntry) => void

export type RepoBlogLinkProps = {
    entry: RepoEntry
    header: HeaderInfo
    css: CSSModuleClasses
    action: LinkAction
}

export default function RepoBlogLink({entry, header, css, action}: RepoBlogLinkProps) {
    const title = header.title ? header.title : entry.name
    const image = header.image ? header.image : defaultImage

    return (<div className={css.repoblog_link}>
        <button className={css.repoblog_link_button} >
            <img className={css.repoblog_link_image} src={image} alt={title}
                 onClick={(e) => action(e.currentTarget, entry)}
            />
            <div className={css.repoblog_link_caption}>
                {title}
            </div>
        </button>
    </div>)
}
