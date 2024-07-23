import { Settings } from '../types/index'

export const defaultSettings: Settings = {
  other_settings: {
    sokoban_style: 'left_line_style',
    debug_mode: false
  },
  shortcuts: {
    upward: 'k',
    downward: 'j',
    open_in_current_tab: 'enter',
    open_in_new_tab_but_stay_on_current: 'C-enter',
    open_in_new_tab_and_focus: 'C-S-enter',
    go_to_search_box: 'i',
    go_to_search_box_and_select_text: 'o',
    focus_on_result_type_tabs: 't'
  }
}
