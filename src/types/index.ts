export interface Settings {
  shortcuts: {
    [command: string]: string;
  };
  other_settings: {
    sokoban_style: 'left_line_style' | 'dotted_rect_style';
    debug_mode: boolean;
  };
}
