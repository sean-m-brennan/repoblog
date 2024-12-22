import { ReactElement } from "react"
import {RepoEntry} from "./RepoBlogConfig"
import defaultImage from "./article.png"

export type LinkAction = (target: EventTarget, entry: RepoEntry) => void

export type RepoBlogLinkProps = {
    entry: RepoEntry
    action: LinkAction
}

export default function RepoBlogLink({entry, action}: RepoBlogLinkProps) {
    const title = entry.header.title ? entry.header.title : entry.name
    const image = entry.header.image ? entry.header.image : defaultImage
    return (<>
        <button style={{width: "200px", height: "200px", backgroundColor: "transparent", border: "none"}} >
            <img src={image} alt={title}
                 style={{maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto"}}
                 onClick={(e) => action(e.currentTarget, entry)}
            />
            {title}
        </button>
    </>)
}
