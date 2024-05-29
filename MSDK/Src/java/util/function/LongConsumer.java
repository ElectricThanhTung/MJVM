package java.util.function;

@FunctionalInterface
public interface LongConsumer {
    void accept(long value);

    default LongConsumer andThen(LongConsumer after) {
        if(after == null)
            throw new NullPointerException();
        return (long t) -> { accept(t); after.accept(t); };
    }
}
