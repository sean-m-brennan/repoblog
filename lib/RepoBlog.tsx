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
import DOMPurify from "dompurify"

import {RepoEntry, getDirListing, RepoBlogConfig} from "./RepoBlogConfig"
import RepoBlogLink from "./RepoBlogLink"
import RepoBlogContent, {ContentContainer} from "./RepoBlogContent"
import empty from "./repoblog.module.css"

marked.use({async: true})

export type RepoBlogProps = {
    config: RepoBlogConfig
    css?: CSSModuleClasses
}

export default function RepoBlog({config, css=empty}: RepoBlogProps) {
    const [activeEntry, setActiveEntry] = useState<RepoEntry|null>(null)
    const [activeHtml, setActiveHtml] = useState("")
    const containerRef = useRef<ContentContainer>(null)
    const [target, setTarget] = useState<EventTarget| null>(null)
    const [listing, setListing] = useState<RepoEntry[]>([])
    const [buttons, setButtons] = useState<ReactElement[]>([])

    useEffect(() => {
        getDirListing(config)
            .then(listing => setListing(listing))
            .catch(err => console.error(err))
    }, [config])

    useEffect(() => {
        const links: ReactElement[] = []
        console.log("list")  // FIXME
        console.log(listing)
        // FIXME listing is too late?
        // FIXME button layout
        // FIXME button configurable size
        listing.forEach((entry, idx) => {
            links.push(<RepoBlogLink key={idx} entry={entry} css={css}
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
    }, [listing, activeEntry])
    console.log(css.repoblog_links)
    return (
        <>
            <div className={css.repoblog_links}>
                {buttons}
            </div>
            <RepoBlogContent containerRef={containerRef} css={css} html={activeHtml}/>
        </>
    )
}