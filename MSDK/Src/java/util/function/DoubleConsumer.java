package java.util.function;

@FunctionalInterface
public interface DoubleConsumer {
    void accept(double value);

    default DoubleConsumer andThen(DoubleConsumer after) {
        if(after == null)
            throw new NullPointerException();
        return (double t) -> { accept(t); after.accept(t); };
    }
}
