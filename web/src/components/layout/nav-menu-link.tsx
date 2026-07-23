import type { ReactNode } from "react";
import { NavLink, type NavLinkProps } from "react-router-dom";

type NavMenuLinkProps = {
  to: string;
  end?: boolean;
  className: NavLinkProps["className"];
  children: ReactNode;
  onAfterNavigate?: () => void;
  role?: string;
  onMouseEnter?: () => void;
  onFocus?: () => void;
};

/** 侧栏/悬浮菜单统一菜单链接。 */
export function NavMenuLink({
  to,
  end,
  className,
  children,
  onAfterNavigate,
  role,
  onMouseEnter,
  onFocus,
}: NavMenuLinkProps) {
  return (
    <NavLink
      to={to}
      end={end}
      role={role}
      className={className}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
      onClick={() => onAfterNavigate?.()}
    >
      {children}
    </NavLink>
  );
}
