import Icon from './Icon';

export default function Button({
  variant = 'ghost',
  size,
  icon,
  iconRight,
  children,
  className = '',
  ...rest
}) {
  const cls = [
    'btn',
    `btn-${variant}`,
    size === 'sm' ? 'btn-sm' : '',
    !children ? 'btn-icon' : '',
    className,
  ].filter(Boolean).join(' ');

  const iconSize = size === 'sm' ? 13 : 15;

  return (
    <button className={cls} {...rest}>
      {icon && <Icon name={icon} size={iconSize} />}
      {children}
      {iconRight && <Icon name={iconRight} size={iconSize} />}
    </button>
  );
}
