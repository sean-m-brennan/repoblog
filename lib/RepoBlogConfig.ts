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
import {fetchJsonSync, fetchSync} from "fetch-sync"

/**
 * JSON config file types
 *   assumes GitHub-style API
 *   apiUrl, user, repo, branch used to access API
 *   basePath is the target directory in the given branch
 *   fileSortRegex governs how filenames are sorted
 *   isRepo - default true, when false use HTML-index mode
 */
export type RepoBlogConfig = {
    apiUrl: string
    rawUrl: string
    user: string
    repo: string
    branch: string
    basePath: string
    fileSortRegex: string
    isRepo?: boolean
    debug?: boolean | string
}

export type HeaderInfo = {
    title: string
    image: string
    preview: string
}

export type RepoEntry = {
    name: string
    path: string
    type: "file" | "dir"
    download_url: string  // only on files
    // Above are fixed to GitHub API
    key?: string
    header: HeaderInfo
}

export function configureRepoBlog(cfgUrl: string, sync: boolean = true): RepoBlogConfig | Promise<RepoBlogConfig> {
    if (sync)
        return fetchJsonSync(cfgUrl) as RepoBlogConfig
    return fetch(cfgUrl)
        .then(res => res.json() as Promise<RepoBlogConfig>)
}

/*********************************/

/**
 * Construct the base path for content
 *
 * @param cfg
 * @param root
 */
export const getBasePath = (cfg: RepoBlogConfig, root: string = "") => {
    if (cfg.isRepo === false) {
        let base = cfg.basePath
        if (base.includes("public")) {
            const idx = base.indexOf("public") + 7
            base = base.slice(idx)
        }
        let url = `/${base}`
        if (root)
            url = `/${root}/${base}`
        return url.replace(new RegExp("//", "g"), "/")
    }
    return `${cfg.rawUrl}/${cfg.user}/${cfg.repo}/refs/heads/${cfg.branch}/${cfg.basePath}`
}

class RBCfg {
    static sub: string = "%resource%"

    private readonly config: RepoBlogConfig
    private readonly sync: boolean
    private readonly htmlMode: boolean
    private readonly urlTemplate: string
    private readonly contentPrefix: string
    private readonly verbose: boolean

    constructor(config: RepoBlogConfig, root: string) {
        this.config = config
        this.sync = true
        this.htmlMode = this.config.isRepo === false;
        if (config.isRepo === false)
            this.urlTemplate = `${getBasePath(config, root)}${RBCfg.sub}`
        else
            this.urlTemplate = `${config.apiUrl}/${config.user}/${config.repo}/contents/${config.basePath}${RBCfg.sub}?ref=${config.branch}`
        this.contentPrefix = getBasePath(config, root)
        this.verbose = this.config.debug === 'verbose'
        this.debug('Debugging for RepoBlog is on. Configure with "debug: false" to remove these messages.')
        this.debug(`HTML mode: ${this.htmlMode}`)
        this.debug(`Metadata template ${this.urlTemplate}`)
        this.debug(`Content template ${this.contentPrefix}`)
    }

    debug(msg: string): void {
        if (import.meta.env.DEV || this.config.debug)
            console.debug("RepoBlog: " + msg)
    }
    // eslint-disable-next-line
    debugObj(obj: any): void {
        if (import.meta.env.DEV || this.config.debug)
            console.debug(obj)
    }

    defaultTitle(filename: string) {
        return path.basename(filename, ".md").replace(new RegExp("_", "g"), " ")
    }

    parseMarkdown(entry: RepoEntry, md: string) {
        const header = {} as HeaderInfo
        const reEntry = {...entry}
        const idx = md.indexOf("# ")
        if (idx < 0)
            header.title = this.defaultTitle(entry.name)
        else
            header.title = md.slice(idx + 2, md.indexOf("\n", idx + 2))
        // eslint-disable-next-line no-useless-escape
        const regex = /\!\[.*\]\((.*)\)/  // ignore IDE errors
        const result = md.match(regex)
        if (result) {
            let filename = result[1].replace(new RegExp("./"), "/")
            if (!filename.startsWith("/"))
                filename = `/${filename}`
            header.image = `${this.contentPrefix}${filename}`
        }
        // FIXME extract first x characters after title into header.preview
        this.debug("Link header:")
        this.debugObj(header)
        reEntry.header = header
        return reEntry
    }

    parseHeaderSync(entry: RepoEntry): RepoEntry {
        if (this.verbose)
            this.debug(`Construct header from ${entry.download_url}`)
        const md = fetchSync(entry.download_url)
        return this.parseMarkdown(entry, md)
    }

    parseHeaderAsync(entry: RepoEntry): Promise<RepoEntry> {
        if (this.verbose)
            this.debug(`Construct header from ${entry.download_url}`)
        return (fetch(entry.download_url)
            .then(res => res.text())
            .then(md => this.parseMarkdown(entry, md))
            .catch(err => {
                console.error(err)
                const reEntry = {...entry}
                reEntry.header.title = this.defaultTitle(entry.name)
                return reEntry
            }))
    }

    listingJson(entries: RepoEntry[]) {
        const files: RepoEntry[] = []
        for (const entry of entries) {
            let reEntry = {...entry}
            if (entry.type === "file" && entry.name.endsWith('.md')) {
                reEntry.key = path.basename(entry.name)
                if (this.sync) {
                    reEntry = this.parseHeaderSync(entry)
                } else {
                    this.parseHeaderAsync(entry)
                        .then(entry => reEntry = entry)
                        .catch(err => {
                            console.error(err)
                            reEntry.header.title = this.defaultTitle(entry.name)
                        })
                }
                files.push(reEntry)
            }
        }
        this.debug("File listing:")
        this.debugObj(files)
        return files
    }

    getDirListingJsonSync(url: string): RepoEntry[] {
        if (this.verbose)
            this.debug(`JSON sync to ${url}`)
        return this.listingJson(fetchJsonSync(url) as RepoEntry[])
    }

    getDirListingJsonAsync(url: string): Promise<RepoEntry[]> {
        if (this.verbose)
            this.debug(`JSON async to ${url}`)
        return (fetch(url)
                .then(res => res.json())
                .then(json => {
                    const entries = json as RepoEntry[]
                    return this.listingJson(entries)
                })
                .catch(err => {
                    console.error(err)
                    return [] as RepoEntry[]
                })
        )
    }

    listingHtml(url: string, body: string) {
        const files: RepoEntry[] = []
        const doc = new DOMParser().parseFromString(body, 'text/html')
        for (const link of doc.links) {
            if (link.href.endsWith('.md')) {
                const fileName = path.basename(link.href)
                let entry = {
                    type: "file",
                    name: fileName,
                    path: `${url}/${fileName}`,
                    key: fileName,
                    header: {} as HeaderInfo,
                    download_url: `${this.contentPrefix}/${fileName}`
                } as RepoEntry

                if (this.sync) {
                    entry = this.parseHeaderSync(entry)
                } else {
                    this.parseHeaderAsync(entry)
                        .then(header => {
                            entry = header
                        })
                        .catch(err => {
                            console.error(err)
                            entry.header.title = this.defaultTitle(entry.name)
                        })
                }
                files.push(entry)
            }
        }
        this.debug("File listing:")
        this.debugObj(files)
        return files
    }

    getDirListingHtmlSync(url: string): RepoEntry[] {
        if (url.endsWith("/"))
            url = url.slice(0, url.length - 1)
        if (this.verbose)
            this.debug(`HTML sync to ${url}`)
        const body = fetchSync(`${url}/index.html`)
        return this.listingHtml(url, body)
    }

    getDirListingHtmlAsync (url: string): Promise<RepoEntry[]> {
        if (url.endsWith("/"))
            url = url.slice(0, url.length - 1)
        if (this.verbose)
            this.debug(`HTML async to ${url}`)
        return (fetch(`${url}/index.html`)
            .then(resp => resp.text())
            .then(body => this.listingHtml(url, body))
            .catch(err => {
                console.error(err)
                return [] as RepoEntry[]
            }))
    }

    filenameMask(cfg: RepoBlogConfig, fileName: string): string|null {
        const regex = new RegExp(cfg.fileSortRegex, "iu")
        if (regex.test(fileName)) {
            const result = regex.exec(fileName)
            return !result ? null : result[0]
        }
        return null
    }

    sorting(files: RepoEntry[]) {
        return files.sort((a, b) => {
            const a_cmp = this.filenameMask(this.config, a.key!)
            const b_cmp = this.filenameMask(this.config, b.key!)
            return a_cmp && !b_cmp ? -1 :
                !a_cmp && b_cmp ? 1 :
                    !a_cmp && !b_cmp ? 0 :
                        a_cmp! > b_cmp! ? 1 : a_cmp! < b_cmp! ? -1 : 0

        })
    }

    dirList(): Promise<RepoEntry[]> | RepoEntry[] {
        const url = this.urlTemplate.replace(RBCfg.sub, "")
        if (this.htmlMode) {
            if (this.sync)
                return this.getDirListingHtmlSync(url)
            return (this.getDirListingHtmlAsync(url)
                .then(files => this.sorting(files))
                .catch(err => {
                    console.error(err)
                    return [] as RepoEntry[]
                }))
        }
        if (this.sync)
            return this.getDirListingJsonSync(url)
        return (this.getDirListingJsonAsync(url)
            .then(files => this.sorting(files))
            .catch(err => {
                console.error(err)
                return [] as RepoEntry[]
            }))
    }
}

/*********************************/

export const getDirListing = (cfg: RepoBlogConfig, root: string=""): RepoEntry[] => {
    return new RBCfg(cfg, root).dirList() as RepoEntry[]
}
