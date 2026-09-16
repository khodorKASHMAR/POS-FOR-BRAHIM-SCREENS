import { defineComponent, h } from 'vue'
import { useIsMobile } from '../composables/useIsMobile'

/**
 * Same route URL; renders Mobile when User-Agent is a phone/tablet, else Desktop.
 * Pass MobileComponent as null to keep desktop on mobile devices (e.g. POS for now).
 */
export function createDevicePage(DesktopComponent, MobileComponent = null) {
  const desktopName = DesktopComponent?.name || DesktopComponent?.__name || 'Desktop'
  return defineComponent({
    name: `Device${desktopName}`,
    inheritAttrs: false,
    // Forward route props (e.g. drafts mode) to the active page
    props: {
      mode: { type: String, default: undefined }
    },
    setup(props, { attrs }) {
      const isMobile = useIsMobile()
      return () => {
        const Comp =
          isMobile.value && MobileComponent ? MobileComponent : DesktopComponent
        const bound = { ...attrs }
        if (props.mode !== undefined) bound.mode = props.mode
        return h(Comp, bound)
      }
    }
  })
}
