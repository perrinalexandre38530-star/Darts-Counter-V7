type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    sfx?: "click" | "soft" | "confirm";
  };
  
  export default function UIButton({
    sfx = "click",
    onClick,
    ...rest
  }: Props) {
    return (
      <button
        {...rest}
        onClick={(e) => {
          UISfx[sfx]();
          onClick?.(e);
        }}
      />
    );
  }
  