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

import path from "path-browserify"
import {fetchJsonSync} from "fetch-sync"

export type RepoBlogConfig = {
    apiUrl: string
    user: string
    repo: string
    basePath: string
    branch: string
    fileSortRegex: string
    defaultImage: string
    isRepo?: boolean
    rootDir?: string
}

type HeaderInfo = {
    title: string
    image: string
    preview: string
}

export type RepoEntry = {
    name: string
    path: string
    type: "file" | "dir"
    // Above are fixed to GitHub API
    key?: string
    header: HeaderInfo
}

const filenameMask = (cfg: RepoBlogConfig, fileName: string): string|null => {
    const regex = new RegExp(cfg.fileSortRegex, "iu")
    if (regex.test(fileName)) {
        const result = regex.exec(fileName)
        return !result ? null : result[0]
    }
    return null
}

const defaultTitle = (filename: string) =>
    path.basename(filename, ".md").replace(new RegExp("_", "g"), " ")

const parseHeader = (entry: RepoEntry): Promise<HeaderInfo> => {
    const header = {} as HeaderInfo

    return (fetch(entry.path)
        .then(res => res.text())
        .then(md => {
            const idx = md.indexOf("# ")
            if (idx < 0)
                header.title = defaultTitle(entry.name)
            else
                header.title = md.slice(idx + 2, md.indexOf("\n", idx + 2))
            // FIXME find first image
            // FIXME extract first x characters after title
            return header
        })
        .catch(err => {
            console.error(err)
            header.title = defaultTitle(entry.name)
            return header
        }))
}

const getDirListingJson= (url: string): Promise<RepoEntry[]> => {
    const files: RepoEntry[] = []
    return (fetch(url)
            .then(res => res.json())
            .then(json => {
                const entries = json as RepoEntry[]
                for (const entry of entries) {
                    if (entry.type === "file" && entry.name.endsWith('.md')) {
                        entry.key = path.basename(entry.name)
                        parseHeader(entry)
                            .then(header => entry.header = header)
                            .catch(err => {
                                console.error(err)
                                entry.header.title = defaultTitle(entry.name)
                            })
                        files.push(entry)
                    }
                }
                return files
            })
            .catch(err => {
                console.error(err)
                return []
            })
    )

}

const getDirListingHtml = (url: string): Promise<RepoEntry[]> => {
    const files: RepoEntry[] = []
    if (url.endsWith("/"))
        url = url.slice(0, url.length - 1)
    return (fetch(`${url}/index.html`)
        .then(resp => resp.text())
        .then(body => {
            const doc = new DOMParser().parseFromString(body, 'text/html')
            for (const link of doc.links) {
                if (link.href.endsWith('.md')) {
                    const fileName = path.basename(link.href)
                    const entry = {
                        type: "file",
                        name: fileName,
                        path: `${url}/${fileName}`,
                        key: fileName,
                        header: {} as HeaderInfo,
                    } as RepoEntry
                    parseHeader(entry)
                        .then(header => entry.header = header)
                        .catch(err => {
                            console.error(err)
                            entry.header.title = defaultTitle(entry.name)
                        })
                    files.push(entry)
                }
            }
            return files
        })
        .catch(err => {
            console.error(err)
            return []
        }))
}

export const getDirListing = (cfg: RepoBlogConfig): Promise<RepoEntry[]> => {
    const sorting = (files: RepoEntry[]) =>
        files.sort((a, b) => {
            const a_cmp = filenameMask(cfg, a.key!)
            const b_cmp = filenameMask(cfg, b.key!)
            return a_cmp && !b_cmp ? -1 :
                !a_cmp && b_cmp ? 1 :
                    !a_cmp && !b_cmp ? 0 :
                        a_cmp! > b_cmp! ? 1 : a_cmp! < b_cmp! ? -1 : 0

        })

    if (import.meta.env.DEV || cfg.isRepo === false) {
        let url = `/${cfg.basePath}`
        if (cfg.rootDir)
            url = `/${cfg.rootDir}/${cfg.basePath}`
        return (getDirListingHtml(url)
            .then(files => sorting(files))
            .catch(err => {
                console.error(err)
                return []
            }))
    }
    const url = `${cfg.apiUrl}/${cfg.user}/${cfg.repo}/contents/${cfg.basePath}?ref=${cfg.branch}`
    return (getDirListingJson(url)
        .then(files => sorting(files))
        .catch(err => {
            console.error(err)
            return []
        }))
}

export function configureRepoBlog(cfgUrl: string, sync: boolean = true): RepoBlogConfig | Promise<RepoBlogConfig> {
    if (sync)
        return fetchJsonSync(cfgUrl) as RepoBlogConfig
    return fetch(cfgUrl)
        .then(res => res.json() as Promise<RepoBlogConfig>)
}
