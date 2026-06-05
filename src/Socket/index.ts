import { DEFAULT_CONNECTION_CONFIG } from '../Defaults'
import type { UserFacingSocketConfig } from '../Types'
import { makeInteropSocket } from './interop'

const makeWASocket = (config: UserFacingSocketConfig) => {
        const newConfig = {
                ...DEFAULT_CONNECTION_CONFIG,
                ...config
        }

        return makeInteropSocket(newConfig)
}

export default makeWASocket
