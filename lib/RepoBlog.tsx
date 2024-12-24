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

import React, {ReactElement, useEffect, useRef, useState} from "react"
import {marked} from "marked"
import {baseUrl} from "marked-base-url"
import DOMPurify from "dompurify"

import {RepoEntry, getDirListing, RepoBlogConfig, getDirListingSync, getBasePath} from "./RepoBlogConfig"
import RepoBlogLink from "./RepoBlogLink"
import RepoBlogContent, {ContentContainer} from "./RepoBlogContent"
import empty from "./repoblog.module.css"


export type RepoBlogProps = {
    config: RepoBlogConfig
    css?: CSSModuleClasses  // default empty
    serverBasename?: string  // default ""
    syncListing?: boolean  // default true
}

/**
 * RepoBlog
 *
 * @param config (required) JSON configuration, see RepoBlogConfig type
 * @param css CSS import that governs Link and Content appearance, see repoblog.module.css.d.ts
 * @param serverBasename basename, if any
 * @param syncListing for HTML mode only, fetch directory listing synchronously, default: true
 * @constructor
 */
export default function RepoBlog({config, css=empty, serverBasename="", syncListing=true}: RepoBlogProps) {
    const [activeEntry, setActiveEntry] = useState<RepoEntry|null>(null)
    const [activeHtml, setActiveHtml] = useState("")
    const containerRef = useRef<ContentContainer>(null)
    const [target, setTarget] = useState<EventTarget| null>(null)
    const [listing, setListing] = useState<RepoEntry[]>([])
    const [buttons, setButtons] = useState<ReactElement[]>([])

    useEffect(() => {
        let fullBase = getBasePath(config, serverBasename)
        if (!fullBase.endsWith("/"))
            fullBase += "/"
        marked.use(
            {async: true},
            baseUrl(fullBase),
        )

        if (syncListing)
            setListing(getDirListingSync(config, serverBasename))
        else
            getDirListing(config, serverBasename)
                .then(list => setListing(list))
                .catch(err => console.error(err))
    }, [config])

    useEffect(() => {
        const links: ReactElement[] = []
        listing.forEach((entry, idx) => {
            links.push(<RepoBlogLink key={idx} entry={entry} header={entry.header} css={css}
                                     action={(t: EventTarget, e: RepoEntry) => {
                                         setTarget(t)
                                         setActiveEntry(e)
                                     }}
            />)
        })
        setButtons(links)
    }, [listing])

    useEffect(() => {
        if (activeEntry === null) {
            if (containerRef.current)
                containerRef.current.hide()
            return
        }

        fetch(`${activeEntry.path}`)
            .then(response => response.blob())
            .then(blob => blob.text())
            .then(markdown => {
                if (containerRef.current === null)
                    throw new Error("Invalid container reference")
                return marked.parse(markdown)
            })
            .then(html => {
                if (containerRef.current === null)
                    throw new Error("Invalid container reference")
                setActiveHtml(DOMPurify.sanitize(html))
                containerRef.current.show(null, target)
            })
            .catch((err) => console.error(err))
    }, [listing, buttons, activeEntry])

    return (
        <>
            <div className={css.repoblog_links}>
                {buttons}
            </div>
            <RepoBlogContent containerRef={containerRef} css={css} html={activeHtml}/>
        </>
    )
}