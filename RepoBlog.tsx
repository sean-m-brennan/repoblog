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

import {useEffect, useRef, useState} from "react"
import {marked} from "marked"
import DOMPurify from "dompurify"
import {OverlayPanel} from "primereact/overlaypanel"
import RepoBlogEntry from "./RepoBlogEntry";  // FIXME can this be generic?

marked.use({async: true})

export type RepoBlogProps = {
    configFile: string
}

export type RepoBlogConfig = {
    apiUrl: string
    user: string
    repo: string
    basePath: string
    branch: string
    fileSortRegex: string
}

declare global {
    var repoblog_config: RepoBlogConfig | null  // eslint-disable-line no-var
}

globalThis.repoblog_config = null

const configureRepoBlog = (cfgUrl: string) => {
    fetch(cfgUrl)
        .then(response => response.json())
        .then(json => {
            globalThis.repoblog_config = json as RepoBlogConfig
        })
        .catch((err) => {console.log(err)})
}

const filenameMask = (fileName: string): string|null => {
    const cfg = globalThis.repoblog_config
    if (!cfg)
        return null
    const regex = new RegExp(cfg.fileSortRegex, "iu")
    if (regex.test(fileName)) {
        const result = regex.exec(fileName)
        return !result ? null : result[0]
    }
    return null
}

type RepoEntry = {
    name: string
    path: string
    type: "file" | "dir"
}

const getDirListing = (path: string): RepoEntry[] => {
    const cfg = globalThis.repoblog_config
    if (!cfg)
        return []
    const url = `${cfg.apiUrl}/${cfg.user}/${cfg.repo}/contents/${cfg.basePath}/${path}?ref=${cfg.branch}`
    const files: RepoEntry[] = []
    fetch(url)
        .then(response => {
            response.json()
                .then((json) => {
                    const data = json as RepoEntry[]
                    for (const entry of data) {
                        if (entry.type == "file" && entry.name.endsWith('.md'))
                            files.push(entry)
                    }
                })
                .catch((err) => {console.log(err)})
        })
        .catch((err) => {console.log(err)})
    return files.sort((a, b) => {
        const a_cmp = filenameMask(a.name)
        const b_cmp = filenameMask(b.name)
        return a_cmp && !b_cmp ? -1 :
            !a_cmp && b_cmp ? 1 :
                !a_cmp && !b_cmp ? 0 :
                    a_cmp! > b_cmp! ? 1 : a_cmp! < b_cmp! ? -1 : 0
    })
}

export default function RepoBlog(props: RepoBlogProps) {
    const [activeEntry, setActiveEntry] = useState<string|null>(null)
    const containerRef = useRef<OverlayPanel>(null)
    const [listing, setListing] = useState<RepoEntry[]>([])

    useEffect(() => {
        configureRepoBlog(props.configFile)
        setListing(getDirListing("blog"))
    }, [props.configFile])

    useEffect(() => {
        if (activeEntry == null) {
            if (containerRef.current)
                containerRef.current.hide()
            return
        }
        fetch(`./${activeEntry}`)
            .then(response => response.blob())
            .then(blob => blob.text())
            .then(markdown => {
                if (!containerRef.current)
                    throw new Error("Invalid container reference")
                return marked.parse(markdown)
            })
            .then(html => {
                if (!containerRef.current)
                    throw new Error("Invalid container reference")
                containerRef.current.getElement().innerHTML = DOMPurify.sanitize(html)
                containerRef.current.show(null, null)
            })
            .catch((err) => console.error(err))
    }, [activeEntry])

    return (
        <>
            {listing.map((entry, idx) =>
                (<RepoBlogEntry key={idx} file={entry.name} onClick={() => setActiveEntry(entry.name)}/>))}
            <OverlayPanel ref={containerRef}
                          showCloseIcon={true} style={{width:'100%',height:'100%'}}/>
        </>
    )
}