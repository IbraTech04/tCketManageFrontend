import Button from './Button';
import { useTheme, cycleTheme } from '../../lib/theme';

const ICON = { system: 'monitor', light: 'sun', dark: 'moon' };
const LABEL = { system: 'System', light: 'Light', dark: 'Dark' };
const NEXT = { system: 'light', light: 'dark', dark: 'system' };

export default function ThemeToggle({ variant = 'ghost', size }) {
  const theme = useTheme();
  return (
    <Button
      variant={variant}
      size={size}
      icon={ICON[theme]}
      onClick={cycleTheme}
      title={`Theme: ${LABEL[theme]} — switch to ${LABEL[NEXT[theme]]}`}
      aria-label={`Theme: ${LABEL[theme]}. Switch to ${LABEL[NEXT[theme]]}.`}
    />
  );
}
