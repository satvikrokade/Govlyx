type Props = {
  label: string;
  type?: "text" | "email" | "password" | "number";
  placeholder?: string;
  helperText?: string;
  // Added for form control
  name?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

const AuthInput = ({
  label,
  type = "text",
  placeholder,
  helperText,
  name,
  value,
  onChange,
}: Props) => {
  return (
    <div className="space-y-1">
      {/* Label */}
      <label className="text-sm opacity-80">
        {label}
      </label>

      {/* Input */}
      <input
        type={type}
        placeholder={placeholder}
        name={name}
        value={value}
        onChange={onChange}
        className="input input-bordered w-full focus:border-blue-700 focus:outline-none"
      />

      {/* Helper text (optional) */}
      {helperText && (
        <p className="text-xs opacity-60">
          {helperText}
        </p>
      )}
    </div>
  );
};

export default AuthInput;